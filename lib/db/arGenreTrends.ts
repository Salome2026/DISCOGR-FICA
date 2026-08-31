import { sql } from "@vercel/postgres";
import type { ArGenreTrendDirection, ArGenreTrendSignal } from "@discografica/shared/types/ar";

export type { ArGenreTrendDirection, ArGenreTrendSignal };

let ready: Promise<void> | null = null;

// Manually-reported "this genre is moving" signals — the honest substitute
// for a real TikTok/Instagram/Google Trends API (none exist affordably).
// scanCatalogRevivalOpportunities() (lib/arCatalogRevival.ts) reads the
// active 'growing' rows to decide which of our own catalog tracks to
// resurface — this table is the trigger, catalog_tracks is the payoff.
export function ensureArGenreTrendSignalsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ar_genre_trend_signals (
          id BIGSERIAL PRIMARY KEY,
          genre TEXT NOT NULL,
          trend_direction TEXT NOT NULL,
          region TEXT NOT NULL DEFAULT 'AR',
          source_type TEXT NOT NULL,
          note TEXT,
          evidence_url TEXT,
          reported_by TEXT,
          reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          active BOOLEAN NOT NULL DEFAULT true
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS ar_genre_trend_signals_active_idx ON ar_genre_trend_signals (active, trend_direction)`;
    })();
  }
  return ready;
}

function rowToSignal(r: Record<string, unknown>): ArGenreTrendSignal {
  return {
    id: Number(r.id),
    genre: r.genre as string,
    trendDirection: r.trend_direction as ArGenreTrendDirection,
    region: r.region as string,
    sourceType: r.source_type as string,
    note: (r.note as string | null) ?? null,
    evidenceUrl: (r.evidence_url as string | null) ?? null,
    reportedBy: (r.reported_by as string | null) ?? null,
    reportedAt: r.reported_at as string,
    active: r.active as boolean,
  };
}

export async function listGenreTrendSignals(opts?: { activeOnly?: boolean }): Promise<ArGenreTrendSignal[]> {
  await ensureArGenreTrendSignalsSchema();
  const { rows } = opts?.activeOnly
    ? await sql`SELECT * FROM ar_genre_trend_signals WHERE active = true ORDER BY reported_at DESC`
    : await sql`SELECT * FROM ar_genre_trend_signals ORDER BY reported_at DESC`;
  return rows.map(rowToSignal);
}

export async function listActiveGrowingGenreTrends(): Promise<ArGenreTrendSignal[]> {
  await ensureArGenreTrendSignalsSchema();
  const { rows } = await sql`
    SELECT * FROM ar_genre_trend_signals WHERE active = true AND trend_direction = 'growing' ORDER BY reported_at DESC
  `;
  return rows.map(rowToSignal);
}

export async function createGenreTrendSignal(input: {
  genre: string;
  trendDirection: ArGenreTrendDirection;
  region?: string;
  sourceType: string;
  note?: string | null;
  evidenceUrl?: string | null;
  reportedBy: string;
}): Promise<ArGenreTrendSignal> {
  await ensureArGenreTrendSignalsSchema();
  const { rows } = await sql`
    INSERT INTO ar_genre_trend_signals (genre, trend_direction, region, source_type, note, evidence_url, reported_by)
    VALUES (${input.genre}, ${input.trendDirection}, ${input.region ?? "AR"}, ${input.sourceType},
            ${input.note ?? null}, ${input.evidenceUrl ?? null}, ${input.reportedBy})
    RETURNING *
  `;
  return rowToSignal(rows[0]);
}

export async function setGenreTrendSignalActive(id: number, active: boolean): Promise<ArGenreTrendSignal | null> {
  await ensureArGenreTrendSignalsSchema();
  const { rows } = await sql`
    UPDATE ar_genre_trend_signals SET active = ${active} WHERE id = ${id} RETURNING *
  `;
  return rows[0] ? rowToSignal(rows[0]) : null;
}
