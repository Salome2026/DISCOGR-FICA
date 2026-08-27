import { put } from "@vercel/blob";
import { docusignConfigured, listCompletedEnvelopes, downloadCombinedDocument, type DocusignEnvelope } from "@/lib/docusign";
import { classifyDocusignDocument } from "@/lib/legalDocClassifier";
import { listContracts, createContract } from "@/lib/db/legalContracts";
import { listSignedReleases, createSignedRelease } from "@/lib/db/legalSignedReleases";
import { listExternalReleases, createExternalRelease } from "@/lib/db/externalReleases";
import { getAllRosterArtistNames } from "@/lib/roster";
import { assignSello } from "@/lib/sellos";

// The email recorded as "cargado por" for anything this pipeline files on
// its own — keeps automated imports visibly distinct from a human's.
const SYSTEM_ACTOR = "docusign-sync@discografica";

export type SyncResult = {
  checked: number;
  imported: number;
  alreadyImported: number;
  errors: { envelopeId: string; subject: string; message: string }[];
};

// Pulls every completed DocuSign envelope, skips whatever's already been
// filed (by docusign_envelope_id, across all three legal tables), and for
// each new one: downloads it, has Gemini read it exactly the way a human
// at Legal would, and files it under the matching module — general artist
// contract, per-song signed release, or Releases Externos (flagged for
// review) when it doesn't match anyone on our roster. No human confirmation
// step by design — this is what "todo automático, sin revisión" means in
// practice, so a wrong read lands as a real record, not a queued draft.
export async function syncNewSignedDocuments(): Promise<SyncResult> {
  if (!docusignConfigured()) {
    throw new Error("DocuSign no está configurado.");
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no está configurado — hace falta para clasificar los documentos.");
  }

  const [envelopes, contracts, releases, externals] = await Promise.all([
    listCompletedEnvelopes(),
    listContracts(),
    listSignedReleases(),
    listExternalReleases(),
  ]);

  const alreadyImported = new Set<string>([
    ...contracts.map((c) => c.docusignEnvelopeId).filter((v): v is string => !!v),
    ...releases.map((r) => r.docusignEnvelopeId).filter((v): v is string => !!v),
    ...externals.map((e) => e.docusignEnvelopeId).filter((v): v is string => !!v),
  ]);

  const newEnvelopes = envelopes.filter((e) => !alreadyImported.has(e.envelopeId));
  const roster = await getAllRosterArtistNames();

  const result: SyncResult = {
    checked: envelopes.length,
    imported: 0,
    alreadyImported: envelopes.length - newEnvelopes.length,
    errors: [],
  };

  for (const envelope of newEnvelopes) {
    try {
      await importOneEnvelope(envelope, roster);
      result.imported++;
    } catch (err) {
      result.errors.push({
        envelopeId: envelope.envelopeId,
        subject: envelope.subject,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

async function importOneEnvelope(envelope: DocusignEnvelope, roster: string[]): Promise<void> {
  const pdf = await downloadCombinedDocument(envelope.envelopeId);
  const classification = await classifyDocusignDocument(pdf.toString("base64"), envelope.subject, roster);

  const firmantesFromEnvelope = envelope.signers.map((s) => s.name).filter(Boolean).join(", ");
  const fechaFirma =
    classification.fechaFirma || (envelope.completedDateTime ? envelope.completedDateTime.slice(0, 10) : null);

  const safeSubject = envelope.subject.replace(/[^a-z0-9\-_. ]/gi, "").trim() || "documento";
  const blob = await put(`legal/docusign/${envelope.envelopeId}-${safeSubject}.pdf`, pdf, {
    access: "private",
    contentType: "application/pdf",
  });

  if (!classification.firmado) {
    // Still file it — silently dropping a completed-status envelope just
    // because the AI couldn't confirm signature evidence would mean it
    // never gets tracked anywhere. Releases Externos + requiereRevision is
    // the same "needs a human look" landing spot used for every other
    // ambiguous case here.
    await createExternalRelease({
      artist: classification.artistaPrincipal || "(sin identificar)",
      titulo: envelope.subject,
      selloExterno: null,
      fechaLanzamiento: null,
      vinculo: null,
      documentoUrl: blob.url,
      documentoNombre: envelope.subject,
      notas: `Importado automáticamente desde DocuSign — evidencia de firma no confirmada por el clasificador (${classification.evidenciaFirma}). Revisar manualmente.`,
      requiereRevision: true,
      docusignEnvelopeId: envelope.envelopeId,
      actorEmail: SYSTEM_ACTOR,
    });
    return;
  }

  if (classification.destino === "release_cancion" && classification.artistaPrincipal && classification.fonograma) {
    await createSignedRelease({
      artist: classification.artistaPrincipal,
      sello: assignSello(classification.artistaPrincipal),
      fonograma: classification.fonograma,
      featuring: classification.featuring || null,
      fechaFirma,
      documentoUrl: blob.url,
      documentoNombre: envelope.subject,
      notas: "Importado automáticamente desde DocuSign.",
      docusignEnvelopeId: envelope.envelopeId,
      actorEmail: SYSTEM_ACTOR,
    });
    return;
  }

  if (classification.destino === "contrato_general" && classification.artistaPrincipal && classification.tipoContrato) {
    await createContract({
      artist: classification.artistaPrincipal,
      sello: assignSello(classification.artistaPrincipal),
      tipoContrato: classification.tipoContrato,
      contraparte: classification.contraparte || null,
      codigoInterno: null,
      firmantes: firmantesFromEnvelope || null,
      fonograma: classification.fonograma || null,
      fechaFirma,
      fechaVencimiento: null,
      estado: "Vigente",
      documentoUrl: blob.url,
      documentoNombre: envelope.subject,
      notas: "Importado automáticamente desde DocuSign.",
      docusignEnvelopeId: envelope.envelopeId,
      actorEmail: SYSTEM_ACTOR,
    });
    return;
  }

  // "externo", "no_reconocido", or a recognized destino missing a field it
  // needed (e.g. release_cancion with no fonograma) — same fallback so it's
  // never silently skipped.
  await createExternalRelease({
    artist: classification.artistaPrincipal || "(sin identificar)",
    titulo: classification.fonograma || envelope.subject,
    selloExterno: null,
    fechaLanzamiento: null,
    vinculo: null,
    documentoUrl: blob.url,
    documentoNombre: envelope.subject,
    notas: `Importado automáticamente desde DocuSign — clasificado como "${classification.destino}". Revisar y reclasificar si corresponde.`,
    requiereRevision: true,
    docusignEnvelopeId: envelope.envelopeId,
    actorEmail: SYSTEM_ACTOR,
  });
}
