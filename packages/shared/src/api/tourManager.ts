// Typed wrappers for /api/tourmanager/* — matches app/api/tourmanager/route.ts
// and app/api/tourmanager/[id]/route.ts exactly. Used by both the web app
// (opportunistically, replacing inline fetch() calls over time) and mobile.

import { apiFetch } from "./client";
import type { HojaDeRuta, HojaBody } from "../types/tourManager";

export function listHojas(): Promise<{ hojas: HojaDeRuta[] }> {
  return apiFetch("/api/tourmanager");
}

export function getHoja(id: string): Promise<{ hoja?: HojaDeRuta; error?: string }> {
  return apiFetch(`/api/tourmanager/${id}`);
}

export function createHoja(input: HojaBody): Promise<{ hoja: HojaDeRuta }> {
  return apiFetch("/api/tourmanager", { method: "POST", body: JSON.stringify(input) });
}

export function updateHoja(id: string, input: HojaBody): Promise<{ hoja: HojaDeRuta }> {
  return apiFetch(`/api/tourmanager/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteHoja(id: string): Promise<{ ok: true }> {
  return apiFetch(`/api/tourmanager/${id}`, { method: "DELETE" });
}
