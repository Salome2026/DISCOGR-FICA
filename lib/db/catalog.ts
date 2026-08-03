import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensureCatalogSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS catalog_tracks (
          id TEXT PRIMARY KEY,
          isrc TEXT,
          track TEXT NOT NULL,
          album TEXT,
          release_date TEXT,
          upc TEXT,
          company TEXT,
          artist_display TEXT NOT NULL,
          participants JSONB NOT NULL DEFAULT '[]',
          sello TEXT,
          streaming_project TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`ALTER TABLE catalog_tracks ADD COLUMN IF NOT EXISTS streaming_project TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS catalog_tracks_sello_idx ON catalog_tracks (sello)`;
      await sql`CREATE INDEX IF NOT EXISTS catalog_tracks_streaming_project_idx ON catalog_tracks (streaming_project)`;
    })();
  }
  return ready;
}

export type CatalogTrack = {
  id: string;
  isrc: string | null;
  track: string;
  album: string | null;
  release_date: string | null;
  upc: string | null;
  company: string | null;
  artist_display: string;
  participants: string[];
  sello: string | null;
  streaming_project: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
};

export async function listTracks(opts?: {
  sello?: string | null;
  streamingProject?: string;
}): Promise<CatalogTrack[]> {
  await ensureCatalogSchema();
  if (opts?.streamingProject) {
    const { rows } = await sql`
      SELECT * FROM catalog_tracks WHERE sello = 'Streamings' AND streaming_project = ${opts.streamingProject}
      ORDER BY release_date DESC NULLS LAST, track ASC
    `;
    return rows as CatalogTrack[];
  }
  if (opts && "sello" in opts) {
    if (opts.sello === null) {
      const { rows } = await sql`
        SELECT * FROM catalog_tracks WHERE sello IS NULL
        ORDER BY release_date DESC NULLS LAST, track ASC
      `;
      return rows as CatalogTrack[];
    }
    const { rows } = await sql`
      SELECT * FROM catalog_tracks WHERE sello = ${opts.sello}
      ORDER BY release_date DESC NULLS LAST, track ASC
    `;
    return rows as CatalogTrack[];
  }
  const { rows } = await sql`
    SELECT * FROM catalog_tracks ORDER BY release_date DESC NULLS LAST, track ASC
  `;
  return rows as CatalogTrack[];
}

export async function getTrack(id: string): Promise<CatalogTrack | null> {
  await ensureCatalogSchema();
  const { rows } = await sql`SELECT * FROM catalog_tracks WHERE id = ${id}`;
  return (rows[0] as CatalogTrack) ?? null;
}

export async function updateTrackClassification(
  id: string,
  classification: { sello: string | null; streamingProject: string | null },
  actorEmail: string
): Promise<CatalogTrack | null> {
  await ensureCatalogSchema();
  const streamingProject =
    classification.sello === "Streamings" ? classification.streamingProject : null;
  const { rows } = await sql`
    UPDATE catalog_tracks
    SET sello = ${classification.sello}, streaming_project = ${streamingProject},
        updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as CatalogTrack) ?? null;
}
