// Extracted from lib/db/tourManager.ts — plain data shapes only, zero
// dependency on @vercel/postgres, so both web and the Expo mobile app can
// import them. lib/db/tourManager.ts re-imports these back (it still owns
// all the actual DB read/write logic, which stays server-only).

export const ESTADOS_HOJA = ["Borrador", "Confirmado"] as const;

export type HojaDeRuta = {
  id: string;
  artistName: string;
  fecha: string;
  horaShow: string | null;
  tipoEvento: string | null;
  venue: string | null;
  venueDireccion: string | null;
  origenDireccion: string | null;
  origenLabel: string | null;

  distanciaIdaKm: number | null;
  duracionIdaMin: number | null;
  distanciaVueltaKm: number | null;
  duracionVueltaMin: number | null;
  horaSalida: string | null;
  horaLlegadaVenue: string | null;
  horaSalidaVenue: string | null;
  horaLlegadaDestino: string | null;

  duracionShowMin: number | null;
  pax: number | null;
  venueContactoNombre: string | null;
  venueContactoTelefono: string | null;
  contactoArtistaNombre: string | null;
  contactoArtistaTelefono: string | null;
  artistLiaisonNombre: string | null;
  artistLiaisonTelefono: string | null;
  driverNombre: string | null;
  driverTelefono: string | null;
  runningOrder: string | null;
  notas: string | null;

  estado: string;

  venueLat: number | null;
  venueLng: number | null;
  venueFullAddress: string | null;
  venueCiudad: string | null;
  venueProvincia: string | null;
  venuePais: string | null;
  origenLat: number | null;
  origenLng: number | null;
  origenFullAddress: string | null;

  bufferPrepMin: number;
  rutaIdaGeojson: unknown | null;
  rutaVueltaGeojson: unknown | null;

  bookingShowId: string | null;
  artistId: string | null;

  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type HojaInput = {
  artistName: string;
  fecha: string;
  horaShow: string | null;
  tipoEvento: string | null;
  venue: string | null;
  venueDireccion: string | null;
  origenDireccion: string | null;
  origenLabel: string | null;

  distanciaIdaKm: number | null;
  duracionIdaMin: number | null;
  distanciaVueltaKm: number | null;
  duracionVueltaMin: number | null;
  horaSalida: string | null;
  horaLlegadaVenue: string | null;
  horaSalidaVenue: string | null;
  horaLlegadaDestino: string | null;

  duracionShowMin: number | null;
  pax: number | null;
  venueContactoNombre: string | null;
  venueContactoTelefono: string | null;
  contactoArtistaNombre: string | null;
  contactoArtistaTelefono: string | null;
  artistLiaisonNombre: string | null;
  artistLiaisonTelefono: string | null;
  driverNombre: string | null;
  driverTelefono: string | null;
  runningOrder: string | null;
  notas: string | null;
  estado: string;

  venueLat?: number | null;
  venueLng?: number | null;
  venueFullAddress?: string | null;
  venueCiudad?: string | null;
  venueProvincia?: string | null;
  venuePais?: string | null;
  origenLat?: number | null;
  origenLng?: number | null;
  origenFullAddress?: string | null;

  bufferPrepMin?: number;
  rutaIdaGeojson?: unknown | null;
  rutaVueltaGeojson?: unknown | null;

  bookingShowId?: string | null;
  artistId?: string | null;

  actorEmail: string;
};

// What the API route bodies actually accept — actorEmail is derived
// server-side from the authenticated session, never sent by a client
// (web or mobile), and estado is optional (defaults to "Borrador").
export type HojaBody = Omit<HojaInput, "actorEmail" | "estado"> & { estado?: string };
