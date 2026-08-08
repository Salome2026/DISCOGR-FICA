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
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
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
    reviewStatus: r.review_status as string,
    reviewedBy: (r.reviewed_by as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    lastSyncedAt: (r.last_synced_at as string | null) ?? null,
    lastTrackAddedAt: (r.last_track_added_at as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listPlaylists(): Promise<SpotifyPlaylistRow[]> {
  await ensureSpotifyPlaylistsSchema();
  const { rows } = await sql`SELECT * FROM spotify_playlists WHERE status = 'active' ORDER BY name ASC`;
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
