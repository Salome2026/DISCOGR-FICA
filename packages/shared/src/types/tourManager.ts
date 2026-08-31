// Extracted from lib/db/tourManager.ts — plain data shapes only, zero
// dependency on @vercel/postgres, so both web and the Expo mobile app can
// import them. lib/db/tourManager.ts re-imports these back (it still owns
// all the actual DB read/write logic, which stays server-only).

export const ESTADOS_HOJA = ["Borrador", "Confirmado"] as const;

// One extra stop the team makes along the way (e.g. a fuel stop, a second
// pickup) — free-form, not everyone needs one, so it lives as an array
// instead of a fixed set of columns. Comes after the hotel in the route
// order (closest fit to "camino de regreso").
export type ParadaIntermedia = {
  nombre: string;
  direccion: string | null;
  fullAddress: string | null;
  lat: number | null;
  lng: number | null;
  hora: string | null;
};

export type HojaDeRuta = {
  id: string;
  artistName: string;
  fecha: string;
  horaShow: string | null;
  horaAperturaPuertas: string | null;
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

  // Punto de encuentro del equipo técnico — puede ser distinto de "origen"
  // (origen = de dónde sale, encuentro = dónde se junta el equipo antes de salir).
  puntoEncuentroNombre: string | null;
  puntoEncuentroDireccion: string | null;
  puntoEncuentroFullAddress: string | null;
  puntoEncuentroLat: number | null;
  puntoEncuentroLng: number | null;
  horaEncuentroEquipo: string | null;

  // Búsqueda del artista por su domicilio.
  direccionBusquedaArtista: string | null;
  busquedaArtistaFullAddress: string | null;
  busquedaArtistaLat: number | null;
  busquedaArtistaLng: number | null;
  horaBusquedaArtista: string | null;

  // Llegada a la ciudad — distinto de la llegada puntual al venue.
  horaLlegadaCiudad: string | null;

  // Prueba de sonido — con dirección propia solo si es distinta al venue.
  lugarPruebaSonido: string | null;
  direccionPruebaSonido: string | null;
  pruebaSonidoFullAddress: string | null;
  pruebaSonidoLat: number | null;
  pruebaSonidoLng: number | null;
  horaPruebaSonido: string | null;
  duracionPruebaSonidoMin: number | null;

  horaComida: string | null;

  // Hotel.
  hotelNombre: string | null;
  hotelDireccion: string | null;
  hotelFullAddress: string | null;
  hotelLat: number | null;
  hotelLng: number | null;
  horaLlegadaHotel: string | null;
  horaCheckin: string | null;
  horaCheckout: string | null;

  paradas: ParadaIntermedia[];

  bufferPrepMin: number;
  rutaIdaGeojson: unknown | null;
  rutaVueltaGeojson: unknown | null;
  rutaCompletaGeojson: unknown | null;

  shareToken: string | null;

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

  horaAperturaPuertas?: string | null;

  puntoEncuentroNombre?: string | null;
  puntoEncuentroDireccion?: string | null;
  puntoEncuentroFullAddress?: string | null;
  puntoEncuentroLat?: number | null;
  puntoEncuentroLng?: number | null;
  horaEncuentroEquipo?: string | null;

  direccionBusquedaArtista?: string | null;
  busquedaArtistaFullAddress?: string | null;
  busquedaArtistaLat?: number | null;
  busquedaArtistaLng?: number | null;
  horaBusquedaArtista?: string | null;

  horaLlegadaCiudad?: string | null;

  lugarPruebaSonido?: string | null;
  direccionPruebaSonido?: string | null;
  pruebaSonidoFullAddress?: string | null;
  pruebaSonidoLat?: number | null;
  pruebaSonidoLng?: number | null;
  horaPruebaSonido?: string | null;
  duracionPruebaSonidoMin?: number | null;

  horaComida?: string | null;

  hotelNombre?: string | null;
  hotelDireccion?: string | null;
  hotelFullAddress?: string | null;
  hotelLat?: number | null;
  hotelLng?: number | null;
  horaLlegadaHotel?: string | null;
  horaCheckin?: string | null;
  horaCheckout?: string | null;

  paradas?: ParadaIntermedia[];

  bufferPrepMin?: number;
  rutaIdaGeojson?: unknown | null;
  rutaVueltaGeojson?: unknown | null;
  rutaCompletaGeojson?: unknown | null;

  bookingShowId?: string | null;
  artistId?: string | null;

  actorEmail: string;
};

// What the API route bodies actually accept — actorEmail is derived
// server-side from the authenticated session, never sent by a client
// (web or mobile), and estado is optional (defaults to "Borrador").
export type HojaBody = Omit<HojaInput, "actorEmail" | "estado"> & { estado?: string };

// The lighter, second kind of hoja de ruta — several shows in one sheet,
// just pickup point + venue + the route between them, deliberately without
// any of the ~30 fields HojaDeRuta has (punto de encuentro, prueba de
// sonido, hotel, internal schedule). distanciaKm/duracionMin are always
// server-computed (same getRoute() the especializada already uses), never
// hand-typed — same "computed, not editable" convention as HojaDeRuta's
// own distanciaIdaKm/duracionIdaMin.
export type GenericShow = {
  fecha: string | null;
  horaShow: string | null;
  busquedaDireccion: string | null;
  busquedaFullAddress: string | null;
  busquedaLat: number | null;
  busquedaLng: number | null;
  venue: string | null;
  venueDireccion: string | null;
  venueFullAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  distanciaKm: number | null;
  duracionMin: number | null;
};

export type HojaGenerica = {
  id: string;
  artistName: string;
  nombre: string | null;
  shows: GenericShow[];
  estado: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
};

export type HojaGenericaInput = {
  artistName: string;
  nombre?: string | null;
  shows: GenericShow[];
  estado?: string;
  actorEmail: string;
};

export type HojaGenericaBody = Omit<HojaGenericaInput, "actorEmail">;
