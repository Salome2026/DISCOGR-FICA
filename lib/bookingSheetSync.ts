import { syncSheetShows, type SheetShow } from "@/lib/db/booking";

// The team's live show-booking sheet — a hand-built visual calendar (one
// column per day, one row-block per artist, free text per cell), not a
// structured table. There's no API access to it; the sheet must be shared as
// "Anyone with the link" for this CSV export to work.
const SHEET_ID = "1qlGsPv06U0_W7jyxshLWGG4FwiJF7zYQE3kXQev3Ygk";
const AGENDA_GID = "0";

// A second, separate agenda some artists keep for themselves — same grid
// shape as the main sheet (artist-rows by date-columns), but only G Sony's
// rows are pulled from it. Candu Domínguez also has a block in this sheet,
// but she's already covered by the main agenda above, so her rows here are
// filtered out to avoid showing the same show twice in Booking.
const GSONY_SHEET_ID = "16LiZw6aiZ8UxMbMSzNgb-Gqy3gp0tCvPXhQ9WxdKeTc";
const GSONY_GID = "0";

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
  "g sony": "G Sony",
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

// Header cells look like "´Mayo 2026", "´Junio2026", "Óctubre 2026" (the
// live "AGENDA" tab — leading curly-quote artifact, inconsistent spacing,
// accented month names, explicit 4-digit year) or "enero 25", "sept 25" (the
// "Hist 2025"/"Hist 2026" tabs — 2-digit year) or "JUNIO Viernes" (the
// "Hist 2024" tab — no year at all, combined with the day name; that tab's
// year has to come from the caller instead, since the cell never states it).
function parseMonthHeader(raw: string, defaultYear?: number): { month: number; year: number } | null {
  const clean = raw
    .replace(/[´`]/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const year4 = clean.match(/\d{4}/);
  const year2 = clean.match(/\b\d{2}\b/);
  let year: number;
  let monthWord: string;
  if (year4) {
    year = parseInt(year4[0], 10);
    monthWord = clean.replace(/\d{4}/, "").trim();
  } else if (year2) {
    year = 2000 + parseInt(year2[0], 10);
    monthWord = clean.replace(/\d{2}/, "").trim();
  } else if (defaultYear) {
    year = defaultYear;
    monthWord = clean;
  } else {
    return null;
  }
  const key = Object.keys(MONTH_NAMES).find((k) => monthWord.startsWith(k));
  if (!key) return null;
  return { month: MONTH_NAMES[key], year };
}

type GridConfig = {
  sheetTab: string;
  monthRowIdx: number;
  dayRowIdx: number;
  dataStartRow: number;
  defaultYear?: number;
};

// Turns the raw grid into one SheetShow per non-empty date cell. Column A
// holds an artist name only on some rows — it applies to that row and every
// row below it until the next non-empty A cell (an artist can reappear
// several times lower down for extra shows that month, which is fine; we
// just keep tracking whatever's most recently seen). Shared by the live
// "AGENDA" tab and the three "Hist <year>" tabs — they lay out the same
// artist-rows-by-date-columns grid, just with the header rows and the
// column-vs-day-of-month(the actual date) at slightly different row offsets
// (see GRID_CONFIGS below).
function parseGrid(rows: string[][], config: GridConfig): SheetShow[] {
  if (rows.length <= config.dataStartRow) return [];
  const monthRow = rows[config.monthRowIdx];
  const dayRow = rows[config.dayRowIdx];

  const colDates: (string | null)[] = monthRow.map((monthCell, col) => {
    if (col === 0) return null;
    const header = parseMonthHeader(monthCell ?? "", config.defaultYear);
    const dayRaw = (dayRow[col] ?? "").trim();
    if (!header || !dayRaw) return null;
    const day = parseInt(dayRaw, 10);
    if (!Number.isFinite(day) || day < 1 || day > 31) return null;
    return `${header.year}-${String(header.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  const cells: SheetShow[] = [];
  let currentArtist = "";
  for (let r = config.dataStartRow; r < rows.length; r++) {
    const row = rows[r];
    const artistCell = (row[0] ?? "").trim();
    if (artistCell) currentArtist = canonicalArtistName(artistCell);
    if (!currentArtist) continue;

    for (let c = 1; c < row.length; c++) {
      const fecha = colDates[c];
      if (!fecha) continue;
      const text = (row[c] ?? "").trim();
      if (!text) continue;
      cells.push({ artistName: currentArtist, fecha, notas: text, valor: extractValor(text), sheetTab: config.sheetTab, sheetRow: r, sheetCol: c });
    }
  }
  return cells;
}

export function parseAgendaGrid(rows: string[][]): SheetShow[] {
  return parseGrid(rows, { sheetTab: "agenda", monthRowIdx: 0, dayRowIdx: 2, dataStartRow: 3 });
}

// The three "Hist <year>" tabs — same show-booking grid, kept as a running
// archive instead of getting cleared out once a show is in the past. Each
// one lays its header out a little differently (see the parseMonthHeader
// comment above), which is why dayRowIdx/dataStartRow vary here even though
// the underlying artist-rows-by-date-columns shape is identical.
const HIST_CONFIGS: GridConfig[] = [
  { sheetTab: "hist2024", monthRowIdx: 0, dayRowIdx: 1, dataStartRow: 2, defaultYear: 2024 },
  { sheetTab: "hist2025", monthRowIdx: 0, dayRowIdx: 2, dataStartRow: 3, defaultYear: 2025 },
  { sheetTab: "hist2026", monthRowIdx: 0, dayRowIdx: 2, dataStartRow: 3, defaultYear: 2026 },
];
const HIST_SHEET_NAMES: Record<string, string> = {
  hist2024: "Hist 2024",
  hist2025: "Hist 2025",
  hist2026: "Hist 2026",
};

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

async function fetchSheetCSV(sheetId: string, params: string): Promise<string> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${sheetId}/${params}`,
    { cache: "no-store" }
  );
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("<")) {
    throw new Error("No se pudo leer la hoja de cálculo (¿sigue compartida como 'cualquiera con el enlace'?).");
  }
  return text;
}

function fetchAgendaCSV(): Promise<string> {
  return fetchSheetCSV(SHEET_ID, `export?format=csv&gid=${AGENDA_GID}`);
}

function fetchGSonySheetCSV(): Promise<string> {
  return fetchSheetCSV(GSONY_SHEET_ID, `export?format=csv&gid=${GSONY_GID}`);
}

// The three Hist tabs aren't exposed as a stable gid the same way the first
// tab is (gid=0 only ever means "first tab") — the gviz endpoint's `sheet=`
// param takes the tab's display name directly instead, which works the same
// way for a link-shared (not "published to web") spreadsheet.
function fetchNamedSheetCSV(sheetName: string): Promise<string> {
  return fetchSheetCSV(SHEET_ID, `gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`);
}

let lastSyncAt = 0;
const MIN_SYNC_INTERVAL_MS = 60_000;

// Rate-limited independent of how often callers ask — several teammates'
// tabs can all be polling at once, but Google's CSV export only actually
// gets hit at most once a minute. Pulls the live "AGENDA" tab plus the three
// "Hist <year>" archive tabs and syncs them in one combined call, so the
// stale-row cleanup in syncSheetShows sees every tab's current cells at once
// instead of treating each other tab's rows as gone.
export async function syncAgendaFromSheet(): Promise<{ upserted: number; removed: number; skipped?: true }> {
  const now = Date.now();
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return { upserted: 0, removed: 0, skipped: true };
  }
  lastSyncAt = now;

  // syncSheetShows treats any previously-synced row absent from THIS call as
  // stale and deletes it — so a transient failure fetching just one tab must
  // abort the whole sync rather than proceed with a partial cell list, or
  // that one tab's entire archive would look "gone" and get wiped out.
  const agendaCsv = await fetchAgendaCSV();
  const cells = parseAgendaGrid(parseCSV(agendaCsv));

  for (const config of HIST_CONFIGS) {
    const csv = await fetchNamedSheetCSV(HIST_SHEET_NAMES[config.sheetTab]);
    cells.push(...parseGrid(parseCSV(csv), config));
  }

  // Same artist-rows-by-date-columns shape as the main agenda tab. Only
  // G Sony's rows are kept — Candu Domínguez also has a block in this sheet,
  // but she's already synced from the main agenda above.
  const gsonyCsv = await fetchGSonySheetCSV();
  const gsonyCells = parseGrid(parseCSV(gsonyCsv), { sheetTab: "agenda-gsony", monthRowIdx: 0, dayRowIdx: 2, dataStartRow: 3 });
  cells.push(...gsonyCells.filter((c) => c.artistName === "G Sony"));

  return syncSheetShows(cells);
}
