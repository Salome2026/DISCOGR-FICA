import { sql } from "@vercel/postgres";

// @vercel/postgres's sql`` typings only accept Primitive (no arrays), even
// though the underlying driver happily sends a JS array as a real Postgres
// array parameter (verified directly) — this cast exists purely to satisfy
// that overly-narrow type, not to change any runtime behavior.
function arrayParam<T>(items: T[]): string | number | boolean {
  return items as unknown as string;
}

let ready: Promise<void> | null = null;

export function ensureFonogramasSheetSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS sheet_fonogramas (
          id TEXT PRIMARY KEY,
          seq BIGSERIAL UNIQUE,
          album_artist TEXT,
          album TEXT,
          track_artist TEXT NOT NULL,
          track TEXT NOT NULL,
          isrc TEXT,
          upc TEXT,
          release_date DATE,
          provider TEXT,
          sello TEXT,
          sheet_row INTEGER NOT NULL,
          synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sheet_fonogramas_fecha_idx ON sheet_fonogramas (release_date)`;
    })();
  }
  return ready;
}

export type SheetFonograma = {
  albumArtist: string | null;
  album: string | null;
  trackArtist: string;
  track: string;
  isrc: string | null;
  upc: string | null;
  releaseDate: string | null;
  provider: string | null;
  sello: string | null;
  sheetRow: number;
};

// Mirrors lib/db/booking.ts's syncSheetShows pattern: upsert every row from
// the latest sheet read, then delete anything previously synced whose key
// no longer appears — the sheet stays the single source of truth for these
// rows. Keyed by ISRC when present (the natural stable identity for a
// fonograma) — falling back to the row's position for the rare row missing
// one, same reasoning booking's sheet sync uses for its own free-text cells.
//
// The sheet has 1000+ rows — one round-trip per row (the naive version of
// this) took over a minute and risked the serverless function's own
// timeout. unnest() turns the whole upsert into a single statement; @vercel/
// postgres passes a plain JS array straight through as a Postgres array
// parameter, no manual array-literal building needed.
export async function syncFonogramasFromSheet(
  rawItems: SheetFonograma[]
): Promise<{ upserted: number; removed: number }> {
  await ensureFonogramasSheetSchema();
  if (rawItems.length === 0) {
    const { rowCount } = await sql`DELETE FROM sheet_fonogramas`;
    return { upserted: 0, removed: rowCount ?? 0 };
  }

  const keyOf = (f: SheetFonograma) => (f.isrc ? `isrc-${f.isrc}` : `row-${f.sheetRow}`);
  // The same ISRC appears on more than one sheet row in practice (reissues,
  // a track relisted under a different album) — a single unnest() upsert
  // can't touch the same id twice in one statement, so collapse to one row
  // per id first. Last occurrence wins, same as the old row-by-row loop
  // naturally did (each later row's upsert simply overwrote the earlier one).
  const byId = new Map<string, SheetFonograma>();
  for (const f of rawItems) byId.set(keyOf(f), f);
  const items = [...byId.values()];

  const ids = items.map(keyOf);
  const albumArtists = items.map((f) => f.albumArtist);
  const albums = items.map((f) => f.album);
  const trackArtists = items.map((f) => f.trackArtist);
  const tracks = items.map((f) => f.track);
  const isrcs = items.map((f) => f.isrc);
  const upcs = items.map((f) => f.upc);
  const releaseDates = items.map((f) => f.releaseDate);
  const providers = items.map((f) => f.provider);
  const sellos = items.map((f) => f.sello);
  const sheetRows = items.map((f) => f.sheetRow);

  await sql`
    INSERT INTO sheet_fonogramas
      (id, album_artist, album, track_artist, track, isrc, upc, release_date, provider, sello, sheet_row, synced_at)
    SELECT id, album_artist, album, track_artist, track, isrc, upc, release_date, provider, sello, sheet_row, now()
    FROM unnest(
      ${arrayParam(ids)}::text[], ${arrayParam(albumArtists)}::text[], ${arrayParam(albums)}::text[],
      ${arrayParam(trackArtists)}::text[], ${arrayParam(tracks)}::text[], ${arrayParam(isrcs)}::text[],
      ${arrayParam(upcs)}::text[], ${arrayParam(releaseDates)}::date[], ${arrayParam(providers)}::text[],
      ${arrayParam(sellos)}::text[], ${arrayParam(sheetRows)}::int[]
    ) AS t(id, album_artist, album, track_artist, track, isrc, upc, release_date, provider, sello, sheet_row)
    ON CONFLICT (id) DO UPDATE SET
      album_artist = EXCLUDED.album_artist, album = EXCLUDED.album, track_artist = EXCLUDED.track_artist,
      track = EXCLUDED.track, isrc = EXCLUDED.isrc, upc = EXCLUDED.upc, release_date = EXCLUDED.release_date,
      provider = EXCLUDED.provider, sello = EXCLUDED.sello, sheet_row = EXCLUDED.sheet_row, synced_at = now()
  `;

  const { rowCount } = await sql`DELETE FROM sheet_fonogramas WHERE NOT (id = ANY(${arrayParam(ids)}::text[]))`;
  return { upserted: items.length, removed: rowCount ?? 0 };
}

export async function listSheetFonogramas() {
  await ensureFonogramasSheetSchema();
  const { rows } = await sql`SELECT * FROM sheet_fonogramas WHERE release_date IS NOT NULL ORDER BY release_date DESC`;
  return rows;
}
