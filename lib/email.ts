import { Resend } from "resend";

const NOTIFY_TO = "salome@mawzrecords.com";

function fromAddress(): string {
  // mawzrecords.com isn't DNS-verified in Resend yet, so we send from Resend's
  // shared test address for now. Once the domain is verified, switch this back
  // to `notificaciones@${process.env.RESEND_EMAIL_DOMAIN}`.
  return "Discográfica <onboarding@resend.dev>";
}

export async function notifyNewLanzamiento(input: {
  artist: string;
  fonograma: string;
  sello: string | null;
  estado: string;
  distribuidora: string | null;
  fecha: string | null;
  autoresCompositores: string | null;
  audioUrl: string | null;
  portadaUrl: string | null;
  createdBy: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurado — no se envió el mail de notificación.");
    return { sent: false, reason: "not_configured" };
  }

  const resend = new Resend(apiKey);
  const rows = [
    ["Artista", input.artist],
    ["Fonograma", input.fonograma],
    ["Sello", input.sello ?? "—"],
    ["Estado", input.estado],
    ["Distribuidora", input.distribuidora ?? "—"],
    ["Fecha de lanzamiento", input.fecha ?? "—"],
    ["Autores y compositores", input.autoresCompositores ?? "—"],
    ["Cargado por", input.createdBy],
  ];

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px;">
      <h2 style="margin: 0 0 12px;">Nuevo lanzamiento cargado</h2>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 10px;color:#666;border-bottom:1px solid #eee;">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${v}</td></tr>`
          )
          .join("")}
      </table>
      <p style="margin-top:16px; font-size:13px;">
        ${input.audioUrl ? `<a href="${input.audioUrl}">Escuchar audio</a><br/>` : "Sin audio cargado.<br/>"}
        ${input.portadaUrl ? `<a href="${input.portadaUrl}">Ver portada</a>` : "Sin portada cargada."}
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: fromAddress(),
      to: NOTIFY_TO,
      subject: `Nuevo lanzamiento: ${input.artist} — ${input.fonograma}`,
      html,
    });
    if (result.error) {
      console.error("Resend error:", result.error);
      return { sent: false, reason: result.error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("Error enviando mail de notificación:", err);
    return { sent: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
