// Typed wrappers for the read-only slice of /api/legal/* that mobile uses
// (the Legal module is a viewer on mobile for now — contract creation/edit
// stays web-only, see app/api/legal/contracts/route.ts's header comment).

import { apiFetch } from "./client";
import type { LegalContract, LegalArtist } from "../types/legal";

export function listContracts(): Promise<{ contracts: LegalContract[] }> {
  return apiFetch("/api/legal/contracts");
}

export function listLegalArtists(): Promise<{ artists: LegalArtist[] }> {
  return apiFetch("/api/legal/artists");
}
