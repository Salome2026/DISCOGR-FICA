// Typed wrappers for the admin (Label) module's read-only data sources —
// the same two endpoints app/dashboard/page.tsx derives its KPI tiles from.

import { apiFetch } from "./client";
import type { Acuerdo, CatalogTrack, RankingRow, StreamingProjectRow, RoyaltySplit, PartyType } from "../types/label";

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

export function listStreamingProjects(all = false): Promise<{ projects: StreamingProjectRow[] }> {
  return apiFetch(`/api/streaming-projects${all ? "?all=1" : ""}`);
}

export function createStreamingProject(name: string): Promise<{ project: StreamingProjectRow }> {
  return apiFetch("/api/streaming-projects", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateStreamingProject(id: number, patch: { name?: string; active?: boolean }): Promise<{ project: StreamingProjectRow }> {
  return apiFetch(`/api/streaming-projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function getRoyaltySplits(trackId: string): Promise<{ track: CatalogTrack; splits: RoyaltySplit[]; error?: string }> {
  return apiFetch(`/api/royalties/${encodeURIComponent(trackId)}`);
}

export function createAcuerdo(input: { nombre: string; compania?: string; prioridad?: string; comentario?: string }): Promise<{ page: unknown }> {
  return apiFetch("/api/releases", { method: "POST", body: JSON.stringify(input) });
}

export function setRoyaltySplits(
  trackId: string,
  splits: { partyType: PartyType; partyName: string; percentage: number }[]
): Promise<{ splits: RoyaltySplit[] }> {
  return apiFetch(`/api/royalties/${encodeURIComponent(trackId)}`, { method: "PUT", body: JSON.stringify({ splits }) });
}
