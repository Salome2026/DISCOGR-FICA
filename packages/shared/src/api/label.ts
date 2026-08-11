// Typed wrappers for the admin (Label) module's read-only data sources —
// the same two endpoints app/dashboard/page.tsx derives its KPI tiles from.

import { apiFetch } from "./client";
import type { Acuerdo, CatalogTrack, RankingRow } from "../types/label";

export function listAcuerdos(): Promise<{ acuerdos: Acuerdo[] }> {
  return apiFetch("/api/acuerdos");
}

export function listCatalogTracks(opts?: { sello?: string; project?: string; unassigned?: boolean }): Promise<{ tracks: CatalogTrack[] }> {
  const params = new URLSearchParams();
  if (opts?.sello) params.set("sello", opts.sello);
  if (opts?.project) params.set("project", opts.project);
  if (opts?.unassigned) params.set("unassigned", "1");
  const qs = params.toString();
  return apiFetch(`/api/catalog/tracks${qs ? `?${qs}` : ""}`);
}

export function getRanking(): Promise<{ ranking: RankingRow[]; lastRun: { finished_at?: string } | null; error?: string }> {
  return apiFetch("/api/ranking");
}
