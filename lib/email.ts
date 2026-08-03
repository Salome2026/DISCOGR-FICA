import { Resend } from "resend";

const NOTIFY_TO = ["operaciones@indyanarecords.com", "salome@mawzrecords.com"];

// Resend caps total attachment size at 40MB per email. Leave headroom for
// the HTML body and Resend's own overhead rather than sending right up to
// the limit.
const ATTACHMENT_BUDGET_BYTES = 35 * 1024 * 1024;

function fromAddress(): string {
  // mawzrecords.com isn't DNS-verified in Resend yet, so we send from Resend's
  // shared test address for now. That sandbox address can only deliver to the
  // Resend account's own verified email — sending to operaciones@indyanarecords.com
  // will likely fail with a 403 until a real sending domain is verified in
  // Resend. Once verified, switch this to `notificaciones@${process.env.RESEND_EMAIL_DOMAIN}`.
  return "Discográfica <onboarding@resend.dev>";
}

type NotifyTrack = {
  trackNumber?: number;
  fonograma: string;
  artist: string;
  colaboradores: string | null;
  productor: string | null;
  isrc: string | null;
  comentario: string | null;
  audioUrl: string | null;
  portadaUrl: string | null;
};

type NotifyInput = {
  tipo: "single" | "ep" | "album";
  artist: string;
  sello: string | null;
  streamingProject: string | null;
  estado: string;
  distribuidora: string | null;
  fecha: string | null;
  hora: string | null;
  createdBy: string;
  // Single only
  fonograma?: string;
  autoresCompositores?: string | null;
  audioUrl?: string | null;
  portadaUrl?: string | null;
  // EP/álbum only
  nombre?: string;
  comentarios?: string | null;
  tracks?: NotifyTrack[];
};

type FileToFetch = { label: string; url: string; filename: string };

function tipoLabel(tipo: NotifyInput["tipo"]): string {
  return tipo === "single" ? "Single" : tipo === "ep" ? "EP" : "Álbum";
}

function safeFilename(name: string, ext: string): string {
  const base = name.replace(/[^a-z0-9\-_. ]/gi, "").trim() || "archivo";
  return `${base}.${ext}`;
}

function extFromUrl(url: string, fallback: string): string {
  const match = url.split("?")[0].match(/\.([a-z0-9]+)$/i);
  return match ? match[1] : fallback;
}

// Builds the row list respecting the exact order fields appear in the
// loading form, and the list of files that should end up either attached
// or linked in the email.
function buildContent(input: NotifyInput): { rows: [string, string][]; files: FileToFetch[] } {
  const rows: [string, string][] = [
    ["Tipo de lanzamiento", tipoLabel(input.tipo)],
    ["Artista", input.artist],
    ["Sello / unidad de negocio", input.sello ?? "—"],
  ];
  if (input.sello === "Streamings") rows.push(["Proyecto de streaming", input.streamingProject ?? "—"]);

  const files: FileToFetch[] = [];

  if (input.tipo === "single") {
    rows.push(["Nombre del fonograma", input.fonograma ?? "—"]);
    rows.push(["Autores y compositores", input.autoresCompositores ?? "—"]);
    rows.push(["Estado del release", input.estado]);
    rows.push(["Distribuidora", input.distribuidora ?? "—"]);
    rows.push(["Fecha de lanzamiento", input.fecha ?? "—"]);
    rows.push(["Hora de lanzamiento (ART)", input.hora ?? "00:00"]);
    if (input.audioUrl) {
      files.push({ label: "Audio", url: input.audioUrl, filename: safeFilename(input.fonograma ?? input.artist, extFromUrl(input.audioUrl, "wav")) });
    }
    if (input.portadaUrl) {
      files.push({ label: "Portada", url: input.portadaUrl, filename: safeFilename(`${input.fonograma ?? input.artist}-portada`, extFromUrl(input.portadaUrl, "jpg")) });
    }
  } else {
    rows.push(["Nombre del " + (input.tipo === "ep" ? "EP" : "álbum"), input.nombre ?? "—"]);
    rows.push(["Estado del release", input.estado]);
    rows.push(["Distribuidora", input.distribuidora ?? "—"]);
    rows.push(["Fecha de lanzamiento", input.fecha ?? "—"]);
    rows.push(["Hora de lanzamiento (ART)", input.hora ?? "00:00"]);
    rows.push(["Comentarios u observaciones", input.comentarios ?? "—"]);
    for (const t of input.tracks ?? []) {
      const n = t.trackNumber ? `#${t.trackNumber} — ` : "";
      rows.push([`Canción ${n}${t.fonograma}`, `Artista: ${t.artist}`]);
      if (t.colaboradores) rows.push(["  Colaboradores", t.colaboradores]);
      if (t.productor) rows.push(["  Productor", t.productor]);
      if (t.isrc) rows.push(["  ISRC", t.isrc]);
      if (t.comentario) rows.push(["  Comentario", t.comentario]);
      if (t.audioUrl) {
        files.push({ label: `Audio — ${t.fonograma}`, url: t.audioUrl, filename: safeFilename(t.fonograma, extFromUrl(t.audioUrl, "wav")) });
      }
      if (t.portadaUrl) {
        files.push({ label: `Portada — ${t.fonograma}`, url: t.portadaUrl, filename: safeFilename(`${t.fonograma}-portada`, extFromUrl(t.portadaUrl, "jpg")) });
      }
    }
  }

  rows.push(["Cargado por", input.createdBy]);
  return { rows, files };
}

async function fetchFile(url: string): Promise<{ buffer: Buffer; size: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { buffer, size: buffer.byteLength };
  } catch (err) {
    console.error(`No se pudo descargar el archivo para adjuntar (${url}):`, err);
    return null;
  }
}

export async function notifyNewLanzamiento(input: NotifyInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurado — no se envió el mail de notificación.");
    return { sent: false, reason: "not_configured" as const };
  }
  const resend = new Resend(apiKey);

  const { rows, files } = buildContent(input);

  // Fetch every file, then greedily attach in order until the size budget
  // runs out — whatever doesn't fit stays as a download link instead of
  // failing the whole send.
  const fetched = await Promise.all(files.map((f) => fetchFile(f.url)));
  const attachments: { filename: string; content: string }[] = [];
  const attachedLabels: string[] = [];
  const linkedFiles: FileToFetch[] = [];
  let runningSize = 0;

  files.forEach((f, i) => {
    const result = fetched[i];
    if (!result) {
      linkedFiles.push(f); // couldn't download — fall back to a link
      return;
    }
    if (runningSize + result.size > ATTACHMENT_BUDGET_BYTES) {
      linkedFiles.push(f); // would exceed Resend's 40MB cap — link instead
      return;
    }
    runningSize += result.size;
    // Resend's SDK JSON.stringifies the request body, and a raw Node Buffer
    // serializes as {type:"Buffer",data:[...]} instead of base64 — send the
    // base64 string explicitly so the API actually receives file bytes.
    attachments.push({ filename: f.filename, content: result.buffer.toString("base64") });
    attachedLabels.push(f.label);
  });

  const title =
    input.tipo === "single"
      ? `${input.artist} — ${input.fonograma ?? ""}`
      : `${input.artist} — ${tipoLabel(input.tipo)} "${input.nombre ?? ""}"`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px;">
      <h2 style="margin: 0 0 12px;">Nuevo lanzamiento cargado</h2>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 10px;color:#666;border-bottom:1px solid #eee;white-space:nowrap;">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${v}</td></tr>`
          )
          .join("")}
      </table>
      ${
        attachedLabels.length > 0
          ? `<p style="margin-top:16px; font-size:13px;"><strong>Adjuntos en este correo:</strong> ${attachedLabels.join(", ")}</p>`
          : ""
      }
      ${
        linkedFiles.length > 0
          ? `<p style="margin-top:8px; font-size:13px;"><strong>Archivos disponibles por link</strong> (muy grandes para adjuntar o no se pudieron descargar):<br/>${linkedFiles
              .map((f) => `<a href="${f.url}">${f.label}</a>`)
              .join("<br/>")}</p>`
          : ""
      }
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: fromAddress(),
      to: NOTIFY_TO,
      subject: `Nuevo lanzamiento: ${title}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    if (result.error) {
      console.error("Resend error enviando notificación de lanzamiento:", result.error);
      return { sent: false, reason: result.error.message };
    }
    console.log(
      `Notificación de lanzamiento enviada a ${NOTIFY_TO.join(", ")} — adjuntos: ${attachedLabels.length}, por link: ${linkedFiles.length}`
    );
    return { sent: true, recipients: NOTIFY_TO, attached: attachedLabels, linked: linkedFiles.map((f) => f.label) };
  } catch (err) {
    console.error("Error enviando mail de notificación:", err);
    return { sent: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
