// Typed wrappers for /api/booking/shows* and /api/booking/artists — matches
// the route handlers under app/api/booking/ exactly. Used by mobile; the
// web ShowCalendar keeps its own inline fetch() calls for now (adopted
// opportunistically, same pattern as Tour Manager's shared api/ layer).

import { apiFetch } from "./client";
import type { BookingShow, BookingShowBody, BookingArtist } from "../types/booking";

export function listShows(): Promise<{ shows: BookingShow[] }> {
  return apiFetch("/api/booking/shows");
}

export function getShow(id: string): Promise<{ show?: BookingShow; error?: string }> {
  return apiFetch(`/api/booking/shows/${id}`);
}

export function createShow(input: BookingShowBody): Promise<{ show: BookingShow }> {
  return apiFetch("/api/booking/shows", { method: "POST", body: JSON.stringify(input) });
}

export function updateShow(id: string, input: BookingShowBody): Promise<{ show: BookingShow }> {
  return apiFetch(`/api/booking/shows/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteShow(id: string): Promise<{ ok: true }> {
  return apiFetch(`/api/booking/shows/${id}`, { method: "DELETE" });
}

export function syncSheet(): Promise<{ upserted: number; removed: number }> {
  return apiFetch("/api/booking/sync-sheet", { method: "POST" });
}

export function listBookingArtists(): Promise<{ artists: BookingArtist[] }> {
  return apiFetch("/api/booking/artists");
}
