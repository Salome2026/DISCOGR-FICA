import { syncSheetShows, type SheetShow } from "@/lib/db/booking";

// The team's live show-booking sheet — a hand-built visual calendar (one
// column per day, one row-block per artist, free text per cell), not a
// structured table. There's no API access to it; the sheet must be shared as
// "Anyone with the link" for this CSV export to work.
const SHEET_ID = "1qlGsPv06U0_W7jyxshLWGG4FwiJF7zYQE3kXQev3Ygk";
const AGENDA_GID = "0";

// The sheet spells some names inconsistently across rows (e.g. "gusty" vs
// "Gusty" vs the artist's actual full name) — without this, the same person
// shows up as separate-looking entries in the calendar, the agenda picker,
// and per-artist counts, and loses the photo already saved under their
// canonical name (photo lookups match by normalized name).
// Canonical names here deliberately match lib/roster.ts's spelling exactly
// (not just any consistent casing) — the artists-table id is a slugified
// version of whatever's stored here, and it needs to land on the same slug
// as the roster entry or it silently creates a second, unlabeled artist row
// instead of reusing the real one.
const ARTIST_ALIASES: Record<string, string> = {
  gusty: "Gusty DJ",
  lazerk: "Lazer K",
  "juana vincet": "Juana Vincent",
};

function canonicalArtistName(name: string): string {
  const key = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  return ARTIST_ALIASES[key] ?? name;
}

const MONTH_NAMES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, sept: 9, sep: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore — paired \n handles the line break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Header cells look like "´Mayo 2026", "´Junio2026", "Óctubre 2026" — a
// leading curly-quote artifact, inconsistent spacing before the year, and
// accented month names. Strip all of that down to a {month, year} pair.
function parseMonthHeader(raw: string): { month: number; year: number } | null {
  const clean = raw
    .replace(/[´`]/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const yearMatch = clean.match(/\d{4}/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[0], 10);
  const monthWord = clean.replace(/\d{4}/, "").trim();
  const key = Object.keys(MONTH_NAMES).find((k) => monthWord.startsWith(k));
  if (!key) return null;
  return { month: MONTH_NAMES[key], year };
}

// Turns the raw grid into one SheetShow per non-empty date cell. Column A
// holds an artist name only on some rows — it applies to that row and every
// row below it until the next non-empty A cell (an artist can reappear
// several times lower down for extra shows that month, which is fine; we
// just keep tracking whatever's most recently seen).
export function parseAgendaGrid(rows: string[][]): SheetShow[] {
  if (rows.length < 3) return [];
  const monthRow = rows[0];
  const dayRow = rows[2];

  const colDates: (string | null)[] = monthRow.map((monthCell, col) => {
    if (col === 0) return null;
    const header = parseMonthHeader(monthCell ?? "");
    const dayRaw = (dayRow[col] ?? "").trim();
    if (!header || !dayRaw) return null;
    const day = parseInt(dayRaw, 10);
    if (!Number.isFinite(day) || day < 1 || day > 31) return null;
    return `${header.year}-${String(header.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  const cells: SheetShow[] = [];
  let currentArtist = "";
  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const artistCell = (row[0] ?? "").trim();
    if (artistCell) currentArtist = canonicalArtistName(artistCell);
    if (!currentArtist) continue;

    for (let c = 1; c < row.length; c++) {
      const fecha = colDates[c];
      if (!fecha) continue;
      const text = (row[c] ?? "").trim();
      if (!text) continue;
      cells.push({ artistName: currentArtist, fecha, notas: text, valor: extractValor(text), sheetRow: r, sheetCol: c });
    }
  }
  return cells;
}

// The team always writes a show's fee as a plain decimal ("1.5", "2,5"),
// sometimes with a "k"/"m" shorthand suffix, mixed in with venue/deposit/time
// text in the same cell — this is a best-effort pull of that one number, not
// a full parse of the cell. It deliberately skips a number immediately
// followed by "hs" (a time like "1,30hs", not a fee) and just returns the
// first plausible match; nothing here ever touches the original notas text,
// so a wrong extraction here is visible, not silently corrupting data.
function extractValor(text: string): string | null {
  const re = /\d{1,3}(?:[.,]\d{1,3})?\s*(?:k|m)\b|\d{1,3}[.,]\d{1,3}\b/gi;
  for (const m of text.matchAll(re)) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 2).toLowerCase();
    if (after.startsWith("hs")) continue;
    return m[0].trim();
  }
  return null;
}

async function fetchAgendaCSV(): Promise<string> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${AGENDA_GID}`,
    { cache: "no-store" }
  );
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("<")) {
    throw new Error("No se pudo leer la hoja de cálculo (¿sigue compartida como 'cualquiera con el enlace'?).");
  }
  return text;
}

let lastSyncAt = 0;
const MIN_SYNC_INTERVAL_MS = 60_000;

// Rate-limited independent of how often callers ask — several teammates'
// tabs can all be polling at once, but Google's CSV export only actually
// gets hit at most once a minute.
export async function syncAgendaFromSheet(): Promise<{ upserted: number; removed: number; skipped?: true }> {
  const now = Date.now();
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return { upserted: 0, removed: 0, skipped: true };
  }
  lastSyncAt = now;
  const csv = await fetchAgendaCSV();
  const rows = parseCSV(csv);
  const cells = parseAgendaGrid(rows);
  return syncSheetShows(cells);
}
