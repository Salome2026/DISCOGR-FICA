import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { docusignConfigured, downloadCombinedDocument } from "@/lib/docusign";
import { createContract, listContracts, TIPOS_CONTRATO } from "@/lib/db/legalContracts";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "editar_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!docusignConfigured()) {
    return NextResponse.json({ error: "DocuSign no está configurado todavía." }, { status: 400 });
  }

  const body = await req.json();
  const {
    envelopeId, subject, artist, sello, tipoContrato, contraparte, fonograma,
    firmantes, fechaFirma,
  } = body as {
    envelopeId?: string; subject?: string; artist?: string; sello?: string | null;
    tipoContrato?: string; contraparte?: string | null; fonograma?: string | null;
    firmantes?: string | null; fechaFirma?: string | null;
  };

  if (!envelopeId) {
    return NextResponse.json({ error: "Falta el envelopeId de DocuSign." }, { status: 400 });
  }
  if (!artist || !artist.trim()) {
    return NextResponse.json({ error: "El artista es obligatorio." }, { status: 400 });
  }
  if (!tipoContrato || !TIPOS_CONTRATO.includes(tipoContrato as (typeof TIPOS_CONTRATO)[number])) {
    return NextResponse.json({ error: "Tipo de contrato inválido." }, { status: 400 });
  }

  // Belt-and-suspenders check before hitting the DB's unique index — gives
  // a clear message instead of a raw constraint-violation error.
  const existing = await listContracts();
  if (existing.some((c) => c.docusignEnvelopeId === envelopeId)) {
    return NextResponse.json({ error: "Este contrato de DocuSign ya fue importado antes." }, { status: 409 });
  }

  let documentoUrl: string;
  try {
    const pdfBuffer = await downloadCombinedDocument(envelopeId);
    const filename = `legal/docusign/${envelopeId}-${(subject || "contrato").replace(/[^a-z0-9\-_. ]/gi, "").trim() || "contrato"}.pdf`;
    const blob = await put(filename, pdfBuffer, { access: "public", contentType: "application/pdf" });
    documentoUrl = blob.url;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `No se pudo descargar el documento de DocuSign: ${err.message}` : "No se pudo descargar el documento de DocuSign." },
      { status: 502 }
    );
  }

  const contract = await createContract({
    artist: artist.trim(),
    sello: sello || null,
    tipoContrato,
    contraparte: contraparte || null,
    codigoInterno: null,
    firmantes: firmantes || null,
    fonograma: fonograma || null,
    fechaFirma: fechaFirma || null,
    fechaVencimiento: null,
    estado: "Vigente",
    documentoUrl,
    documentoNombre: subject || "Contrato DocuSign",
    notas: null,
    docusignEnvelopeId: envelopeId,
    actorEmail: user.email,
  });

  return NextResponse.json({ contract });
}
