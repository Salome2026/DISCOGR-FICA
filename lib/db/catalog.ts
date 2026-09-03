import { sql } from "@vercel/postgres";
import { getReleaseById } from "./releases";

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
      await sql`ALTER TABLE catalog_tracks ADD COLUMN IF NOT EXISTS genero TEXT`;
      await sql`ALTER TABLE catalog_tracks ADD COLUMN IF NOT EXISTS producer TEXT`;
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
  genero: string | null;
  producer: string | null;
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

export async function searchTracks(q: string, limit = 20): Promise<CatalogTrack[]> {
  await ensureCatalogSchema();
  const query = q.trim();
  if (!query) return [];
  const { rows } = await sql`
    SELECT * FROM catalog_tracks
    WHERE track ILIKE ${"%" + query + "%"} OR artist_display ILIKE ${"%" + query + "%"}
    ORDER BY release_date DESC NULLS LAST, track ASC
    LIMIT ${limit}
  `;
  return rows as CatalogTrack[];
}

export async function getTrack(id: string): Promise<CatalogTrack | null> {
  await ensureCatalogSchema();
  const { rows } = await sql`SELECT * FROM catalog_tracks WHERE id = ${id}`;
  return (rows[0] as CatalogTrack) ?? null;
}

// Past releases where this exact name appears as a participant (main
// artist or featuring) — used to give the marketing-plan generator real
// context on what this artist has already put out, instead of starting
// from zero on every request.
export async function getArtistCatalogHistory(name: string, limit = 8): Promise<CatalogTrack[]> {
  await ensureCatalogSchema();
  const { rows } = await sql`
    SELECT * FROM catalog_tracks
    WHERE participants @> ${JSON.stringify([name])}::jsonb
    ORDER BY release_date DESC NULLS LAST
    LIMIT ${limit}
  `;
  return rows as CatalogTrack[];
}

// Mirrors a pm_releases row (single or one EP/álbum canción) into the
// general catalog so it shows up everywhere sello/streaming pages, fichas
// and rankings already read from — same table, not a parallel copy. Keyed
// by a stable synthetic id (pm-<release id>) so re-saving the same release
// (e.g. after an estado edit) updates in place instead of duplicating.
export async function upsertTrackFromRelease(t: {
  id: string;
  track: string;
  album: string | null;
  releaseDate: string | null;
  company: string | null;
  artistDisplay: string;
  participants: string[];
  sello: string | null;
  streamingProject: string | null;
  isrc?: string | null;
  genero?: string | null;
  producer?: string | null;
}): Promise<void> {
  await ensureCatalogSchema();
  const isrc = t.isrc ?? null;
  const genero = t.genero ?? null;
  const producer = t.producer ?? null;
  await sql`
    INSERT INTO catalog_tracks
      (id, isrc, track, album, release_date, upc, company, artist_display, participants, sello, streaming_project, genero, producer)
    VALUES
      (${t.id}, ${isrc}, ${t.track}, ${t.album}, ${t.releaseDate}, NULL, ${t.company}, ${t.artistDisplay},
       ${JSON.stringify(t.participants)}::jsonb, ${t.sello}, ${t.streamingProject}, ${genero}, ${producer})
    ON CONFLICT (id) DO UPDATE SET
      track = EXCLUDED.track,
      album = EXCLUDED.album,
      release_date = EXCLUDED.release_date,
      company = EXCLUDED.company,
      artist_display = EXCLUDED.artist_display,
      participants = EXCLUDED.participants,
      sello = EXCLUDED.sello,
      streaming_project = EXCLUDED.streaming_project,
      isrc = COALESCE(EXCLUDED.isrc, catalog_tracks.isrc),
      genero = COALESCE(EXCLUDED.genero, catalog_tracks.genero),
      producer = COALESCE(EXCLUDED.producer, catalog_tracks.producer)
  `;
}

// Fonogramas cargados antes de que cada alta espejara automáticamente en
// catalog_tracks se quedaron sin esa fila — genera la que falta a partir del
// pm_releases real. Reusado tanto por el split-editorial "normal" (canción ya
// elegida por catalogTrackId) como por el link de un split cargado a mano
// contra un fonograma recién creado — misma lógica, un solo lugar.
export async function ensureCatalogTrackForRelease(pmReleaseId: number): Promise<CatalogTrack | null> {
  const id = `pm-${pmReleaseId}`;
  const existing = await getTrack(id);
  if (existing) return existing;
  const release = await getReleaseById(pmReleaseId);
  if (!release) return null;
  const participants = [release.artist_name as string];
  if (release.colaboradores) {
    for (const c of String(release.colaboradores).split(",")) {
      const n = c.trim();
      if (n) participants.push(n);
    }
  }
  await upsertTrackFromRelease({
    id,
    track: release.fonograma_nombre as string,
    album: null,
    releaseDate: (release.fecha_lanzamiento as string | null) ?? null,
    company: release.distribuidora === "Sin definir" ? null : ((release.distribuidora as string | null) ?? null),
    artistDisplay: release.artist_name as string,
    participants,
    sello: (release.sello as string | null) ?? null,
    streamingProject: (release.streaming_project as string | null) ?? null,
    isrc: (release.isrc as string | null) ?? null,
    genero: (release.genero as string | null) ?? null,
    producer: (release.productor as string | null) ?? null,
  });
  return getTrack(id);
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
