import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensureSpotifyPlaylistTracksSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS spotify_playlist_tracks (
          id BIGSERIAL PRIMARY KEY,
          playlist_id TEXT NOT NULL REFERENCES spotify_playlists(id) ON DELETE CASCADE,
          spotify_track_id TEXT NOT NULL,
          catalog_track_id TEXT REFERENCES catalog_tracks(id) ON DELETE SET NULL,
          isrc TEXT,
          position INTEGER,
          source TEXT NOT NULL DEFAULT 'manual',
          match_score NUMERIC,
          drive_title TEXT,
          drive_artist TEXT,
          added_by TEXT,
          added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          removed_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS spotify_playlist_tracks_active_idx
        ON spotify_playlist_tracks (playlist_id, spotify_track_id) WHERE removed_at IS NULL
      `;
      await sql`CREATE INDEX IF NOT EXISTS spotify_playlist_tracks_playlist_idx ON spotify_playlist_tracks (playlist_id)`;
    })();
  }
  return ready;
}

export type SpotifyPlaylistTrackRow = {
  id: number;
  playlistId: string;
  spotifyTrackId: string;
  catalogTrackId: string | null;
  isrc: string | null;
  position: number | null;
  source: string;
  matchScore: number | null;
  driveTitle: string | null;
  driveArtist: string | null;
  addedBy: string | null;
  addedAt: string;
  removedAt: string | null;
};

function rowToTrack(r: Record<string, unknown>): SpotifyPlaylistTrackRow {
  return {
    id: Number(r.id),
    playlistId: r.playlist_id as string,
    spotifyTrackId: r.spotify_track_id as string,
    catalogTrackId: (r.catalog_track_id as string | null) ?? null,
    isrc: (r.isrc as string | null) ?? null,
    position: (r.position as number | null) ?? null,
    source: r.source as string,
    matchScore: r.match_score != null ? Number(r.match_score) : null,
    driveTitle: (r.drive_title as string | null) ?? null,
    driveArtist: (r.drive_artist as string | null) ?? null,
    addedBy: (r.added_by as string | null) ?? null,
    addedAt: r.added_at as string,
    removedAt: (r.removed_at as string | null) ?? null,
  };
}

export async function logTrackAdded(t: {
  playlistId: string;
  spotifyTrackId: string;
  position: number | null;
  source: string;
  matchScore: number | null;
  driveTitle: string | null;
  driveArtist: string | null;
  addedBy: string | null;
}): Promise<void> {
  await ensureSpotifyPlaylistTracksSchema();
  await sql`
    INSERT INTO spotify_playlist_tracks
      (playlist_id, spotify_track_id, position, source, match_score, drive_title, drive_artist, added_by)
    VALUES
      (${t.playlistId}, ${t.spotifyTrackId}, ${t.position}, ${t.source}, ${t.matchScore}, ${t.driveTitle}, ${t.driveArtist}, ${t.addedBy})
    ON CONFLICT (playlist_id, spotify_track_id) WHERE removed_at IS NULL DO NOTHING
  `;
}

export async function listTracksForPlaylist(playlistId: string): Promise<SpotifyPlaylistTrackRow[]> {
  await ensureSpotifyPlaylistTracksSchema();
  const { rows } = await sql`
    SELECT * FROM spotify_playlist_tracks
    WHERE playlist_id = ${playlistId} AND removed_at IS NULL
    ORDER BY position ASC NULLS LAST, added_at ASC
  `;
  return rows.map(rowToTrack);
}
