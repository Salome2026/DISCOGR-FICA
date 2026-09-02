import nodemailer from "nodemailer";

const NOTIFY_TO = ["salome@mawzrecords.com", "support@indyanarecords.com", "agustinargibay@mawzrecords.com"];

// Gmail caps total message size (headers + body + attachments, after
// base64 encoding) at 25MB. Base64 inflates raw bytes by ~37%, so keep the
// raw-bytes budget well under that ceiling.
const ATTACHMENT_BUDGET_BYTES = 17 * 1024 * 1024;

type NotifyTrack = {
  trackNumber?: number;
  fonograma: string;
  artist: string;
  autoresCompositores: string | null;
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
  colaboradores?: string | null;
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
    rows.push(["Featuring / artistas invitados", input.colaboradores ?? "—"]);
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
      if (t.autoresCompositores) rows.push(["  Autores y compositores", t.autoresCompositores]);
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
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    console.warn("GMAIL_USER / GMAIL_APP_PASSWORD no configurados — no se envió el mail de notificación.");
    return { sent: false, reason: "not_configured" as const };
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const { rows, files } = buildContent(input);

  // Fetch every file, then greedily attach in order until the size budget
  // runs out — whatever doesn't fit stays as a download link instead of
  // failing the whole send.
  const fetched = await Promise.all(files.map((f) => fetchFile(f.url)));
  const attachments: { filename: string; content: Buffer }[] = [];
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
      linkedFiles.push(f); // would exceed Gmail's 25MB message cap — link instead
      return;
    }
    runningSize += result.size;
    attachments.push({ filename: f.filename, content: result.buffer });
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
    await transporter.sendMail({
      from: `Discográfica <${gmailUser}>`,
      to: NOTIFY_TO,
      subject: `Nuevo lanzamiento: ${title}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    console.log(
      `Notificación de lanzamiento enviada a ${NOTIFY_TO.join(", ")} — adjuntos: ${attachedLabels.length}, por link: ${linkedFiles.length}`
    );
    return { sent: true, recipients: NOTIFY_TO, attached: attachedLabels, linked: linkedFiles.map((f) => f.label) };
  } catch (err) {
    console.error("Error enviando mail de notificación:", err);
    return { sent: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
