// Typed wrappers for the admin (Label) module's read-only data sources —
// the same two endpoints app/dashboard/page.tsx derives its KPI tiles from.

import { apiFetch } from "./client";
import type { Acuerdo, CatalogTrack } from "../types/label";

export function listAcuerdos(): Promise<{ acuerdos: Acuerdo[] }> {
  return apiFetch("/api/acuerdos");
}

export function listCatalogTracks(): Promise<{ tracks: CatalogTrack[] }> {
  return apiFetch("/api/catalog/tracks");
}
