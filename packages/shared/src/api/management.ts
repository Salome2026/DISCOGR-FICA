// Typed wrappers for the read-only slice of /api/management/* that mobile
// uses (viewer only for now — photo upload/reorder/estado editing stays
// web-only, see app/api/management/artists/route.ts's header comment).

import { apiFetch } from "./client";
import type { ManagementArtistRow, ManagementReleaseRow } from "../types/management";

export function listManagementArtists(): Promise<{ artists: ManagementArtistRow[] }> {
  return apiFetch("/api/management/artists");
}

export function listManagementReleases(): Promise<{ releases: ManagementReleaseRow[] }> {
  return apiFetch("/api/management/releases");
}
