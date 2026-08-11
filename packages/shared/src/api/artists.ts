// Typed wrapper for /api/artists/search — the same roster-wide typeahead
// used by the web ArtistPicker (Tour Manager, AI marketing-plan form).

import { apiFetch } from "./client";

export type ArtistResult = { id: string; name: string; photoUrl: string | null };

export function searchArtists(q: string): Promise<{ results: ArtistResult[] }> {
  return apiFetch(`/api/artists/search?q=${encodeURIComponent(q)}`);
}
