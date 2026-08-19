// Typed wrappers for /api/ar/* — matches app/api/ar/route.ts and
// app/api/ar/[id]/route.ts exactly. Used by both web (opportunistically)
// and mobile.

import { apiFetch } from "./client";
import type { ArOpportunity, ArOpportunityComment, ArOpportunityInput, ArOpportunityUpdate } from "../types/ar";

export function listOpportunities(): Promise<{ opportunities: ArOpportunity[] }> {
  return apiFetch("/api/ar");
}

export function getOpportunity(id: string): Promise<{ opportunity?: ArOpportunity; error?: string }> {
  return apiFetch(`/api/ar/${id}`);
}

export function createOpportunity(input: ArOpportunityInput): Promise<{ opportunity: ArOpportunity }> {
  return apiFetch("/api/ar", { method: "POST", body: JSON.stringify(input) });
}

export function updateOpportunity(id: string, input: ArOpportunityUpdate): Promise<{ opportunity: ArOpportunity }> {
  return apiFetch(`/api/ar/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function listComments(id: string): Promise<{ comments: ArOpportunityComment[] }> {
  return apiFetch(`/api/ar/${id}/comments`);
}

export function addComment(id: string, body: string): Promise<{ comment: ArOpportunityComment }> {
  return apiFetch(`/api/ar/${id}/comments`, { method: "POST", body: JSON.stringify({ body }) });
}
