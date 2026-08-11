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

export type ResolvedAddress = {
  resolved: boolean;
  lat?: number;
  lng?: number;
  fullAddress?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
};

export function resolveAddress(input: string): Promise<ResolvedAddress> {
  return apiFetch("/api/tourmanager/resolve-address", { method: "POST", body: JSON.stringify({ input }) });
}

export type RoutePreview = {
  resolved: boolean;
  distanceKm?: number;
  durationMin?: number;
  geometry?: unknown;
};

export function previewRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RoutePreview> {
  return apiFetch("/api/tourmanager/route-preview", { method: "POST", body: JSON.stringify({ origin, destination }) });
}
