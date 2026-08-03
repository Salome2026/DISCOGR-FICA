import { sql } from "@vercel/postgres";

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS artist_listeners_daily (
          id BIGSERIAL PRIMARY KEY,
          artist_id TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          spotify_id TEXT,
          sello TEXT,
          measured_at DATE NOT NULL,
          monthly_listeners INTEGER,
          followers INTEGER,
          source TEXT NOT NULL DEFAULT 'chartmetric',
          fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          error TEXT,
          UNIQUE (artist_id, measured_at)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_listeners_artist_date
          ON artist_listeners_daily (artist_id, measured_at DESC)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS listeners_sync_runs (
          id BIGSERIAL PRIMARY KEY,
          started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          finished_at TIMESTAMPTZ,
          artists_ok INTEGER NOT NULL DEFAULT 0,
          artists_failed INTEGER NOT NULL DEFAULT 0,
          notes TEXT
        )
      `;
    })();
  }
  return schemaReady;
}

export type DailyRecord = {
  artistId: string;
  artistName: string;
  spotifyId: string | null;
  sello: string | null;
  measuredAt: string; // YYYY-MM-DD
  monthlyListeners: number | null;
  followers: number | null;
  source: string;
  error?: string | null;
};

export async function upsertDailyRecord(r: DailyRecord) {
  await ensureSchema();
  await sql`
    INSERT INTO artist_listeners_daily
      (artist_id, artist_name, spotify_id, sello, measured_at, monthly_listeners, followers, source, error)
    VALUES
      (${r.artistId}, ${r.artistName}, ${r.spotifyId}, ${r.sello}, ${r.measuredAt},
       ${r.monthlyListeners}, ${r.followers}, ${r.source}, ${r.error ?? null})
    ON CONFLICT (artist_id, measured_at)
    DO UPDATE SET
      monthly_listeners = EXCLUDED.monthly_listeners,
      followers = EXCLUDED.followers,
      fetched_at = now(),
      error = EXCLUDED.error
  `;
}

export async function startSyncRun(): Promise<number> {
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO listeners_sync_runs (started_at) VALUES (now()) RETURNING id
  `;
  return rows[0].id as number;
}

export async function finishSyncRun(id: number, ok: number, failed: number, notes?: string) {
  await sql`
    UPDATE listeners_sync_runs
    SET finished_at = now(), artists_ok = ${ok}, artists_failed = ${failed}, notes = ${notes ?? null}
    WHERE id = ${id}
  `;
}

export async function getLastSyncRun() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM listeners_sync_runs ORDER BY started_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

export type RankingRow = {
  artist_id: string;
  artist_name: string;
  sello: string | null;
  monthly_listeners: number | null;
  followers: number | null;
  measured_at: string;
  prev_day: number | null;
  prev_7d: number | null;
  prev_30d: number | null;
};

// Latest reading per artist + comparison points for variation deltas.
export async function getRankingLatest(): Promise<RankingRow[]> {
  await ensureSchema();
  const { rows } = await sql`
    WITH latest AS (
      SELECT DISTINCT ON (artist_id)
        artist_id, artist_name, sello, monthly_listeners, followers, measured_at
      FROM artist_listeners_daily
      ORDER BY artist_id, measured_at DESC
    )
    SELECT
      l.artist_id, l.artist_name, l.sello, l.monthly_listeners, l.followers, l.measured_at,
      (SELECT monthly_listeners FROM artist_listeners_daily d
        WHERE d.artist_id = l.artist_id AND d.measured_at = l.measured_at - INTERVAL '1 day') AS prev_day,
      (SELECT monthly_listeners FROM artist_listeners_daily d
        WHERE d.artist_id = l.artist_id AND d.measured_at = l.measured_at - INTERVAL '7 day') AS prev_7d,
      (SELECT monthly_listeners FROM artist_listeners_daily d
        WHERE d.artist_id = l.artist_id AND d.measured_at = l.measured_at - INTERVAL '30 day') AS prev_30d
    FROM latest l
    ORDER BY l.monthly_listeners DESC NULLS LAST
  `;
  return rows as RankingRow[];
}

export async function getArtistHistory(artistId: string, sinceDays: number) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT measured_at, monthly_listeners, followers
    FROM artist_listeners_daily
    WHERE artist_id = ${artistId}
      AND measured_at >= (CURRENT_DATE - ${sinceDays}::int)
    ORDER BY measured_at ASC
  `;
  return rows;
}

// Looks an artist up by name (as opposed to Chartmetric's internal id) — the
// entry point for a ficha page reached from anywhere that only has a name
// (the catalog's participants list, not just the ranking table).
export async function getArtistLatestByName(name: string) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT DISTINCT ON (artist_id) *
    FROM artist_listeners_daily
    WHERE lower(artist_name) = lower(${name})
    ORDER BY artist_id, measured_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getArtistHistoryByName(name: string, sinceDays: number) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT measured_at, monthly_listeners, followers
    FROM artist_listeners_daily
    WHERE lower(artist_name) = lower(${name})
      AND measured_at >= (CURRENT_DATE - ${sinceDays}::int)
    ORDER BY measured_at ASC
  `;
  return rows;
}
