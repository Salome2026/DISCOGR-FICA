// Extracted from lib/db/booking.ts — plain data shape only, zero dependency
// on @vercel/postgres, so both web and the Expo mobile app can import it.
// lib/db/booking.ts keeps owning the real type (unchanged) — this mirrors it
// so mobile isn't stuck re-declaring it by hand.

export const ESTADOS_SHOW = ["Pendiente", "Confirmado", "Cerrado"] as const;

export type BookingShow = {
  id: string;
  artistName: string;
  fecha: string;
  hora: string | null;
  venue: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  lat: number | null;
  lng: number | null;
  estado: string;
  contactoId: string | null;
  notas: string | null;
  valor: string | null;
  source: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

// What POST/PATCH /api/booking/shows bodies accept — createdBy is derived
// server-side from the authenticated session, never sent by a client.
export type BookingShowBody = {
  artistName: string;
  fecha: string;
  hora?: string | null;
  venue?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
  estado?: string;
  contactoId?: string | null;
  notas?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type BookingArtist = { id: string; name: string; sello: string | null; photoUrl: string | null };
