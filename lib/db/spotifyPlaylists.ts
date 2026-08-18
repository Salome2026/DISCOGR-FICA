import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensureSpotifyPlaylistsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS spotify_playlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          genre TEXT,
          sello TEXT,
          drive_folder_id TEXT,
          drive_folder_path TEXT,
          cover_image_url TEXT,
          cover_source TEXT,
          spotify_url TEXT,
          follower_count INTEGER,
          track_count INTEGER,
          status TEXT NOT NULL DEFAULT 'active',
          review_status TEXT NOT NULL DEFAULT 'approved',
          reviewed_by TEXT,
          reviewed_at TIMESTAMPTZ,
          last_synced_at TIMESTAMPTZ,
          last_track_added_at TIMESTAMPTZ,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      // Tracks which Drive doc a given playlist came from, so the ingestion
      // route can skip docs it already processed on a re-run instead of
      // creating duplicate playlists.
      await sql`ALTER TABLE spotify_playlists ADD COLUMN IF NOT EXISTS drive_doc_id TEXT`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS spotify_playlists_drive_doc_idx ON spotify_playlists (drive_doc_id) WHERE drive_doc_id IS NOT NULL`;

      // Separates the connected account's own pre-existing playlists
      // ("personal") from the ones this app created for the label
      // ("label" — Drive ingest or the future manual-create admin flow).
      // upsertPlaylistFromSpotify() mirrors *every* playlist in the
      // connected account (both kinds), so it only sets this on first
      // INSERT and never touches it again on re-sync.
      await sql`ALTER TABLE spotify_playlists ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'personal'`;
      await sql`UPDATE spotify_playlists SET origin = 'label' WHERE drive_doc_id IS NOT NULL OR created_by IS NOT NULL`;
    })();
  }
  return ready;
}

export type SpotifyPlaylistRow = {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  sello: string | null;
  driveFolderId: string | null;
  driveFolderPath: string | null;
  coverImageUrl: string | null;
  coverSource: string | null;
  spotifyUrl: string | null;
  followerCount: number | null;
  trackCount: number | null;
  status: string;
  origin: string;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  driveDocId: string | null;
  lastSyncedAt: string | null;
  lastTrackAddedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToPlaylist(r: Record<string, unknown>): SpotifyPlaylistRow {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    genre: (r.genre as string | null) ?? null,
    sello: (r.sello as string | null) ?? null,
    driveFolderId: (r.drive_folder_id as string | null) ?? null,
    driveFolderPath: (r.drive_folder_path as string | null) ?? null,
    coverImageUrl: (r.cover_image_url as string | null) ?? null,
    coverSource: (r.cover_source as string | null) ?? null,
    spotifyUrl: (r.spotify_url as string | null) ?? null,
    followerCount: (r.follower_count as number | null) ?? null,
    trackCount: (r.track_count as number | null) ?? null,
    status: r.status as string,
    origin: r.origin as string,
    reviewStatus: r.review_status as string,
    reviewedBy: (r.reviewed_by as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    driveDocId: (r.drive_doc_id as string | null) ?? null,
    lastSyncedAt: (r.last_synced_at as string | null) ?? null,
    lastTrackAddedAt: (r.last_track_added_at as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listPlaylists(origin?: "personal" | "label"): Promise<SpotifyPlaylistRow[]> {
  await ensureSpotifyPlaylistsSchema();
  const { rows } = origin
    ? await sql`SELECT * FROM spotify_playlists WHERE status = 'active' AND origin = ${origin} ORDER BY name ASC`
    : await sql`SELECT * FROM spotify_playlists WHERE status = 'active' ORDER BY name ASC`;
  return rows.map(rowToPlaylist);
}

// Mirrors a playlist as it exists in Spotify right now into the local cache
// — id/name/description/cover/track-count always reflect Spotify on a plain
// read-sync; genre/sello/drive_folder_*/review_status stay whatever was set
// locally (manual edit or Drive ingest), never overwritten here.
export async function upsertPlaylistFromSpotify(p: {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  spotifyUrl: string | null;
  trackCount: number | null;
}): Promise<void> {
  await ensureSpotifyPlaylistsSchema();
  await sql`
    INSERT INTO spotify_playlists (id, name, description, cover_image_url, spotify_url, track_count, last_synced_at)
    VALUES (${p.id}, ${p.name}, ${p.description}, ${p.coverImageUrl}, ${p.spotifyUrl}, ${p.trackCount}, now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      cover_image_url = EXCLUDED.cover_image_url,
      spotify_url = EXCLUDED.spotify_url,
      track_count = EXCLUDED.track_count,
      last_synced_at = now()
  `;
}

export async function updateFollowerCount(id: string, followerCount: number): Promise<void> {
  await ensureSpotifyPlaylistsSchema();
  await sql`UPDATE spotify_playlists SET follower_count = ${followerCount}, last_synced_at = now() WHERE id = ${id}`;
}

// Has this Drive doc already been turned into a playlist? Lets the
// ingestion route be re-run safely — it just skips docs it already did.
export async function findPlaylistByDriveDocId(driveDocId: string): Promise<string | null> {
  await ensureSpotifyPlaylistsSchema();
  const { rows } = await sql`SELECT id FROM spotify_playlists WHERE drive_doc_id = ${driveDocId}`;
  return (rows[0]?.id as string | undefined) ?? null;
}

// Records a playlist just created in Spotify from a Drive doc — always
// review_status='pending' (the ingestion gate); the manual-create path in
// the admin UI (Fase 2) inserts rows directly with 'approved' instead.
export async function insertIngestedPlaylist(p: {
  id: string;
  name: string;
  genre: string;
  driveFolderId: string;
  driveFolderPath: string;
  driveDocId: string;
  coverImageUrl: string | null;
  coverSource: string | null;
  spotifyUrl: string | null;
  trackCount: number;
  createdBy: string;
}): Promise<void> {
  await ensureSpotifyPlaylistsSchema();
  await sql`
    INSERT INTO spotify_playlists
      (id, name, genre, drive_folder_id, drive_folder_path, drive_doc_id, cover_image_url, cover_source,
       spotify_url, track_count, status, origin, review_status, created_by)
    VALUES
      (${p.id}, ${p.name}, ${p.genre}, ${p.driveFolderId}, ${p.driveFolderPath}, ${p.driveDocId}, ${p.coverImageUrl},
       ${p.coverSource}, ${p.spotifyUrl}, ${p.trackCount}, 'active', 'label', 'pending', ${p.createdBy})
  `;
}

export async function listPendingReview(): Promise<SpotifyPlaylistRow[]> {
  await ensureSpotifyPlaylistsSchema();
  const { rows } = await sql`
    SELECT * FROM spotify_playlists WHERE review_status = 'pending' ORDER BY genre ASC, name ASC
  `;
  return rows.map(rowToPlaylist);
}

export async function getPlaylistById(id: string): Promise<SpotifyPlaylistRow | null> {
  await ensureSpotifyPlaylistsSchema();
  const { rows } = await sql`SELECT * FROM spotify_playlists WHERE id = ${id}`;
  return rows[0] ? rowToPlaylist(rows[0]) : null;
}

export async function approvePlaylist(id: string, actorEmail: string): Promise<void> {
  await ensureSpotifyPlaylistsSchema();
  await sql`
    UPDATE spotify_playlists
    SET review_status = 'approved', reviewed_by = ${actorEmail}, reviewed_at = now()
    WHERE id = ${id}
  `;
}
