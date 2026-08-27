import { syncFonogramasFromSheet, type SheetFonograma } from "@/lib/db/fonogramasSheet";
import { assignSello } from "@/lib/sellos";

// "Fonogramas MAWZ & INDYANA" — the team's master catalog sheet, shared as
// "cualquiera con el enlace" so this CSV export works without credentials,
// same mechanism as lib/bookingSheetSync.ts uses for the booking agenda.
// gid 428933130 is the "ogs" tab: album_artist, album, track_artist, track,
// isrc, upc, release_date, year, provider, capif, sello.
const SHEET_ID = "1HI1Thde6Xq0B_OIMLvyLwGm6M2ItZksgJwPY60Gt9bU";
const OGS_GID = "428933130";

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

function cell(row: string[], idx: number): string | null {
  const v = idx >= 0 ? (row[idx] ?? "").trim() : "";
  return v.length > 0 ? v : null;
}

// The sheet's own "sello" column is almost entirely blank in practice — the
// real signal for which of the two labels a track belongs to is the artist
// name, matched against the same roster lib/sellos.ts already uses to
// suggest a sello when a PM types an artist into "Nuevo lanzamiento".
export function parseFonogramasRows(rows: string[][]): SheetFonograma[] {
  if (rows.length < 2) return [];
  const header = rows[0];
  const idx = {
    albumArtist: header.indexOf("album_artist"),
    album: header.indexOf("album"),
    trackArtist: header.indexOf("track_artist"),
    track: header.indexOf("track"),
    isrc: header.indexOf("isrc"),
    upc: header.indexOf("upc"),
    releaseDate: header.indexOf("release_date"),
    provider: header.indexOf("provider"),
  };

  const out: SheetFonograma[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const trackArtist = cell(row, idx.trackArtist);
    const track = cell(row, idx.track);
    if (!trackArtist || !track) continue;
    const releaseDateRaw = cell(row, idx.releaseDate);
    const releaseDate = releaseDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(releaseDateRaw) ? releaseDateRaw : null;
    out.push({
      albumArtist: cell(row, idx.albumArtist),
      album: cell(row, idx.album),
      trackArtist,
      track,
      isrc: cell(row, idx.isrc),
      upc: cell(row, idx.upc),
      releaseDate,
      provider: cell(row, idx.provider),
      sello: assignSello(trackArtist),
      sheetRow: r,
    });
  }
  return out;
}

async function fetchFonogramasCSV(): Promise<string> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${OGS_GID}`,
    { cache: "no-store" }
  );
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("<")) {
    throw new Error("No se pudo leer la planilla de fonogramas (¿sigue compartida como 'cualquiera con el enlace'?).");
  }
  return text;
}

let lastSyncAt = 0;
const MIN_SYNC_INTERVAL_MS = 60_000;

// Rate-limited the same way syncAgendaFromSheet is — several people loading
// the dashboard at once should still only hit Google's CSV export at most
// once a minute.
export async function syncFonogramasSheet(): Promise<{ upserted: number; removed: number; skipped?: true }> {
  const now = Date.now();
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return { upserted: 0, removed: 0, skipped: true };
  }
  lastSyncAt = now;
  const csv = await fetchFonogramasCSV();
  const rows = parseCSV(csv);
  const items = parseFonogramasRows(rows);
  return syncFonogramasFromSheet(items);
}
