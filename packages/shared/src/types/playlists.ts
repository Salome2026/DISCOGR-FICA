// Matches the client-side Playlist type in app/panel/playlists/page.tsx
// (as returned by GET /api/playlists).

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  sello: string | null;
  coverImageUrl: string | null;
  spotifyUrl: string | null;
  followerCount: number | null;
  trackCount: number | null;
  lastSyncedAt: string | null;
};
