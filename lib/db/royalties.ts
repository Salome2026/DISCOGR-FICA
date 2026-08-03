import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensureRoyaltiesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS royalty_splits (
          id BIGSERIAL PRIMARY KEY,
          track_id TEXT NOT NULL,
          party_type TEXT NOT NULL,
          party_name TEXT NOT NULL,
          percentage NUMERIC NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS royalty_splits_track_idx ON royalty_splits (track_id)`;
    })();
  }
  return ready;
}

export type PartyType = "sello" | "artista";

export type RoyaltySplit = {
  id: number;
  track_id: string;
  party_type: PartyType;
  party_name: string;
  percentage: number;
  created_at: string;
  updated_by: string | null;
};

export async function getSplitsForTrack(trackId: string): Promise<RoyaltySplit[]> {
  await ensureRoyaltiesSchema();
  const { rows } = await sql`
    SELECT * FROM royalty_splits WHERE track_id = ${trackId} ORDER BY party_type, id
  `;
  return rows as RoyaltySplit[];
}

// Splits are per-fonograma, never a catalog-wide default — replacing them
// means replacing the whole set for that one track_id, nothing else.
export async function setSplitsForTrack(
  trackId: string,
  splits: { partyType: PartyType; partyName: string; percentage: number }[],
  actorEmail: string
): Promise<RoyaltySplit[]> {
  await ensureRoyaltiesSchema();
  await sql`DELETE FROM royalty_splits WHERE track_id = ${trackId}`;
  for (const s of splits) {
    await sql`
      INSERT INTO royalty_splits (track_id, party_type, party_name, percentage, updated_by)
      VALUES (${trackId}, ${s.partyType}, ${s.partyName}, ${s.percentage}, ${actorEmail})
    `;
  }
  return getSplitsForTrack(trackId);
}

export async function countTracksWithSplits(): Promise<number> {
  await ensureRoyaltiesSchema();
  const { rows } = await sql`SELECT count(DISTINCT track_id) FROM royalty_splits`;
  return Number(rows[0].count);
}
