// Typed wrapper for the read-only slice of /api/playlists that mobile uses.
// Connecting the label's Spotify account is a one-time OAuth redirect tied
// to a browser session/cookie (see app/api/spotify/authorize/route.ts) —
// that setup step stays web-only; mobile only views playlists once connected.

import { apiFetch } from "./client";
import type { Playlist } from "../types/playlists";

export function listPlaylists(): Promise<{ configured: boolean; playlists: Playlist[]; error?: string }> {
  return apiFetch("/api/playlists");
}
