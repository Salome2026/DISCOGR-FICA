// Typed wrapper for the read-only slice of /api/pm/releases that mobile
// uses (viewer only for now — create/edit/delete stays web-only, the
// NuevoLanzamientoForm flow is too large to port in this pass).

import { apiFetch } from "./client";
import type { PmRelease } from "../types/pm";

export function listPmReleases(): Promise<{ releases: PmRelease[] }> {
  return apiFetch("/api/pm/releases");
}
