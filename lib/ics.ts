// Generador de .ics puro (RFC 5545), sin librerías externas — el formato es
// texto plano simple y esto evita sumar una dependencia para algo que son
// ~80 líneas. Pensado específicamente para "Reuniones de Management": cada
// reunión es un VEVENT con UID estable (el id de la fila en
// pm_meeting_requests, que nunca cambia) para que actualizar/cancelar desde
// la plataforma actualice el mismo evento en Apple Calendar en vez de
// duplicarlo — Apple Calendar (y cualquier cliente RFC 5545) matchea
// eventos por UID dentro del mismo calendario/feed.

const TZID = "America/Argentina/Buenos_Aires";
const CRLF = "\r\n";

// RFC 5545 §3.3.11 — backslash, punto y coma, coma y saltos de línea se
// escapan; los saltos de línea se representan como "\n" literal (no CRLF).
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

// RFC 5545 §3.1 — ninguna línea de contenido puede superar 75 octetos;
// las líneas más largas se "pliegan" con CRLF + un espacio al inicio de la
// continuación. Se pliega por caracteres (no bytes UTF-8 exactos) — de
// sobra para el texto que este archivo genera.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let out = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    out += CRLF + " " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return out;
}

function line(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

// Las columnas DATE de Postgres llegan acá como objetos Date, no strings —
// pmArtistWorkspace.ts las tipa como `string` porque JSON.stringify() las
// serializa solas en cualquier otra ruta (NextResponse.json), pero acá se
// arma texto a mano, así que hay que normalizarlas primero.
function toDateOnlyString(v: string | Date): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v.slice(0, 10);
}

// "20260305T140000" — sin el sufijo Z (queda en hora local, calificada por
// el TZID que va en el propio parámetro de la property DTSTART/DTEND). Sin
// horario (reunión sin scheduled_time) devuelve null — el caller arma un
// evento de todo el día en su lugar.
function formatLocalDateTime(dateISO: string | Date, time: string | null): string | null {
  if (!time) return null;
  const [y, m, d] = toDateOnlyString(dateISO).split("-");
  const [hh, mm] = time.split(":");
  return `${y}${m}${d}T${(hh ?? "00").padStart(2, "0")}${(mm ?? "00").padStart(2, "0")}00`;
}

function formatDateOnly(dateISO: string | Date): string {
  return toDateOnlyString(dateISO).replace(/-/g, "");
}

// now() no está disponible en Workflow scripts ni en algunos contextos de
// server — este archivo corre en rutas API normales de Next, donde sí lo
// está; se mantiene como función para poder inyectar una fecha fija en
// tests si hiciera falta más adelante.
function nowUtcStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export type IcsMeeting = {
  id: string;
  artistName: string;
  pmEmail: string;
  comment: string;
  status: "Pendiente" | "Agendada" | "Realizada" | "Cancelada" | string;
  scheduledDate: string | Date | null;
  scheduledTime: string | null;
  suggestedDate: string | Date | null;
  participantes: string | null;
  modalidad: string | null;
  direccionOLink: string | null;
  updatedAt: string | Date | null;
  createdAt: string | Date;
};

const ICS_STATUS: Record<string, string> = {
  Pendiente: "TENTATIVE",
  Agendada: "CONFIRMED",
  Realizada: "CONFIRMED",
  Cancelada: "CANCELLED",
};

// Un solo VEVENT — reusado tanto por el feed completo (varios, uno por
// reunión) como por la descarga individual ("Agregar a Apple Calendar" de
// una reunión puntual, que es este mismo bloque envuelto en su propio
// VCALENDAR de un solo evento).
export function buildMeetingVEvent(m: IcsMeeting): string {
  const date = m.scheduledDate ?? m.suggestedDate;
  if (!date) return ""; // sin fecha no hay evento que poner en un calendario

  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(line("UID", `mgmt-meeting-${m.id}@vpocorp.com`));
  lines.push(line("DTSTAMP", nowUtcStamp()));

  const startLocal = formatLocalDateTime(date, m.scheduledTime);
  if (startLocal) {
    // Sin campo de "hora de fin" explícito en el modelo — 1 hora de
    // duración por default, editable a mano por quien reciba el evento.
    const [datePart, timePart] = startLocal.split("T");
    const endHour = (Number(timePart.slice(0, 2)) + 1) % 24;
    const endLocal = `${datePart}T${String(endHour).padStart(2, "0")}${timePart.slice(2)}`;
    lines.push(foldLine(`DTSTART;TZID=${TZID}:${startLocal}`));
    lines.push(foldLine(`DTEND;TZID=${TZID}:${endLocal}`));
  } else {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(date)}`);
  }

  lines.push(line("SUMMARY", escapeIcsText(`Reunión de Management — ${m.artistName}`)));

  const descriptionParts = [
    `Artista/proyecto: ${m.artistName}`,
    `PM responsable: ${m.pmEmail}`,
    m.participantes ? `Participantes: ${m.participantes}` : null,
    m.modalidad ? `Modalidad: ${m.modalidad}` : null,
    m.comment ? `Temario: ${m.comment}` : null,
  ].filter((p): p is string => !!p);
  if (descriptionParts.length > 0) {
    lines.push(line("DESCRIPTION", escapeIcsText(descriptionParts.join("\n"))));
  }
  if (m.direccionOLink) {
    lines.push(line("LOCATION", escapeIcsText(m.direccionOLink)));
  }
  lines.push(line("STATUS", ICS_STATUS[m.status] ?? "CONFIRMED"));
  if (m.updatedAt) {
    lines.push(line("LAST-MODIFIED", nowUtcStampFrom(m.updatedAt)));
  }
  lines.push("END:VEVENT");
  return lines.join(CRLF);
}

function nowUtcStampFrom(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildIcsCalendar(vevents: string[], calendarName: string): string {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VPO Corp//Reuniones de Management//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    line("X-WR-CALNAME", escapeIcsText(calendarName)),
    line("X-WR-TIMEZONE", TZID),
    ...vevents.filter(Boolean),
    "END:VCALENDAR",
  ].join(CRLF);
  return body + CRLF;
}
