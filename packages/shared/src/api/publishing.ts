// Typed wrappers for the read-only slice of /api/publishing/* that mobile
// uses (viewer only for now — create/edit stays web-only).

import { apiFetch } from "./client";
import type { PublishingArtist } from "../types/publishing";

export function listPublishingArtists(): Promise<{ artists: PublishingArtist[] }> {
  return apiFetch("/api/publishing/artists");
}

export function getPublishingArtist(id: string): Promise<{ artist?: PublishingArtist; error?: string }> {
  return apiFetch(`/api/publishing/artists/${id}`);
}
