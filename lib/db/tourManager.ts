import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensureTourManagerSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS tourmanager_hojas (
          id TEXT PRIMARY KEY,

          artist_name TEXT NOT NULL,
          fecha DATE NOT NULL,
          hora_show TEXT,
          tipo_evento TEXT,
          venue TEXT,
          venue_direccion TEXT,
          origen_direccion TEXT,
          origen_label TEXT,

          distancia_ida_km NUMERIC,
          duracion_ida_min INTEGER,
          distancia_vuelta_km NUMERIC,
          duracion_vuelta_min INTEGER,
          hora_salida TEXT,
          hora_llegada_venue TEXT,
          hora_salida_venue TEXT,
          hora_llegada_destino TEXT,

          duracion_show_min INTEGER,
          pax INTEGER,
          venue_contacto_nombre TEXT,
          venue_contacto_telefono TEXT,
          contacto_artista_nombre TEXT,
          contacto_artista_telefono TEXT,
          artist_liaison_nombre TEXT,
          artist_liaison_telefono TEXT,
          driver_nombre TEXT,
          driver_telefono TEXT,
          running_order TEXT,
          notas TEXT,

          estado TEXT NOT NULL DEFAULT 'Borrador',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS tourmanager_hojas_fecha_idx ON tourmanager_hojas (fecha)`;
      await sql`CREATE INDEX IF NOT EXISTS tourmanager_hojas_artist_idx ON tourmanager_hojas (artist_name)`;

      // Fase 3 — direcciones resueltas (geocoding), separadas del texto
      // crudo que la persona tipeó/pegó — mismo criterio que Booking usa
      // para ciudad/provincia/pais (typed) vs lat/lng (derivado).
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS venue_lat DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS venue_lng DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS venue_full_address TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS venue_ciudad TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS venue_provincia TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS venue_pais TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS origen_lat DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS origen_lng DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS origen_full_address TEXT`;

      // Fase 4 — ruta automática (OSRM).
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS buffer_prep_min INTEGER NOT NULL DEFAULT 30`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS ruta_ida_geojson JSONB`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS ruta_vuelta_geojson JSONB`;

      // Fase 6 — links suaves a Booking/artists, sin FK forzada (mismo
      // criterio que contacto_id en booking_shows).
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS booking_show_id TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS artist_id TEXT`;
    })();
  }
  return ready;
}

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

function toDateKey(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToHoja(r: Record<string, unknown>): HojaDeRuta {
  return {
    id: r.id as string,
    artistName: r.artist_name as string,
    fecha: toDateKey(r.fecha),
    horaShow: (r.hora_show as string | null) ?? null,
    tipoEvento: (r.tipo_evento as string | null) ?? null,
    venue: (r.venue as string | null) ?? null,
    venueDireccion: (r.venue_direccion as string | null) ?? null,
    origenDireccion: (r.origen_direccion as string | null) ?? null,
    origenLabel: (r.origen_label as string | null) ?? null,

    distanciaIdaKm: r.distancia_ida_km != null ? Number(r.distancia_ida_km) : null,
    duracionIdaMin: (r.duracion_ida_min as number | null) ?? null,
    distanciaVueltaKm: r.distancia_vuelta_km != null ? Number(r.distancia_vuelta_km) : null,
    duracionVueltaMin: (r.duracion_vuelta_min as number | null) ?? null,
    horaSalida: (r.hora_salida as string | null) ?? null,
    horaLlegadaVenue: (r.hora_llegada_venue as string | null) ?? null,
    horaSalidaVenue: (r.hora_salida_venue as string | null) ?? null,
    horaLlegadaDestino: (r.hora_llegada_destino as string | null) ?? null,

    duracionShowMin: (r.duracion_show_min as number | null) ?? null,
    pax: (r.pax as number | null) ?? null,
    venueContactoNombre: (r.venue_contacto_nombre as string | null) ?? null,
    venueContactoTelefono: (r.venue_contacto_telefono as string | null) ?? null,
    contactoArtistaNombre: (r.contacto_artista_nombre as string | null) ?? null,
    contactoArtistaTelefono: (r.contacto_artista_telefono as string | null) ?? null,
    artistLiaisonNombre: (r.artist_liaison_nombre as string | null) ?? null,
    artistLiaisonTelefono: (r.artist_liaison_telefono as string | null) ?? null,
    driverNombre: (r.driver_nombre as string | null) ?? null,
    driverTelefono: (r.driver_telefono as string | null) ?? null,
    runningOrder: (r.running_order as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,

    estado: r.estado as string,

    venueLat: (r.venue_lat as number | null) ?? null,
    venueLng: (r.venue_lng as number | null) ?? null,
    venueFullAddress: (r.venue_full_address as string | null) ?? null,
    venueCiudad: (r.venue_ciudad as string | null) ?? null,
    venueProvincia: (r.venue_provincia as string | null) ?? null,
    venuePais: (r.venue_pais as string | null) ?? null,
    origenLat: (r.origen_lat as number | null) ?? null,
    origenLng: (r.origen_lng as number | null) ?? null,
    origenFullAddress: (r.origen_full_address as string | null) ?? null,

    bufferPrepMin: (r.buffer_prep_min as number) ?? 30,
    rutaIdaGeojson: r.ruta_ida_geojson ?? null,
    rutaVueltaGeojson: r.ruta_vuelta_geojson ?? null,

    bookingShowId: (r.booking_show_id as string | null) ?? null,
    artistId: (r.artist_id as string | null) ?? null,

    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listHojas(): Promise<HojaDeRuta[]> {
  await ensureTourManagerSchema();
  const { rows } = await sql`SELECT * FROM tourmanager_hojas ORDER BY fecha ASC, id ASC`;
  return rows.map(rowToHoja);
}

export async function getHoja(id: string): Promise<HojaDeRuta | null> {
  await ensureTourManagerSchema();
  const { rows } = await sql`SELECT * FROM tourmanager_hojas WHERE id = ${id}`;
  return rows[0] ? rowToHoja(rows[0]) : null;
}

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

export async function createHoja(input: HojaInput): Promise<HojaDeRuta> {
  await ensureTourManagerSchema();
  const id = `hoja-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO tourmanager_hojas
      (id, artist_name, fecha, hora_show, tipo_evento, venue, venue_direccion, origen_direccion, origen_label,
       distancia_ida_km, duracion_ida_min, distancia_vuelta_km, duracion_vuelta_min,
       hora_salida, hora_llegada_venue, hora_salida_venue, hora_llegada_destino,
       duracion_show_min, pax, venue_contacto_nombre, venue_contacto_telefono,
       contacto_artista_nombre, contacto_artista_telefono, artist_liaison_nombre, artist_liaison_telefono,
       driver_nombre, driver_telefono, running_order, notas, estado,
       venue_lat, venue_lng, venue_full_address, venue_ciudad, venue_provincia, venue_pais,
       origen_lat, origen_lng, origen_full_address, buffer_prep_min, ruta_ida_geojson, ruta_vuelta_geojson,
       booking_show_id, artist_id, updated_by, updated_at)
    VALUES
      (${id}, ${input.artistName}, ${input.fecha}::date, ${input.horaShow}, ${input.tipoEvento}, ${input.venue},
       ${input.venueDireccion}, ${input.origenDireccion}, ${input.origenLabel},
       ${input.distanciaIdaKm}, ${input.duracionIdaMin}, ${input.distanciaVueltaKm}, ${input.duracionVueltaMin},
       ${input.horaSalida}, ${input.horaLlegadaVenue}, ${input.horaSalidaVenue}, ${input.horaLlegadaDestino},
       ${input.duracionShowMin}, ${input.pax}, ${input.venueContactoNombre}, ${input.venueContactoTelefono},
       ${input.contactoArtistaNombre}, ${input.contactoArtistaTelefono}, ${input.artistLiaisonNombre}, ${input.artistLiaisonTelefono},
       ${input.driverNombre}, ${input.driverTelefono}, ${input.runningOrder}, ${input.notas}, ${input.estado},
       ${input.venueLat ?? null}, ${input.venueLng ?? null}, ${input.venueFullAddress ?? null},
       ${input.venueCiudad ?? null}, ${input.venueProvincia ?? null}, ${input.venuePais ?? null},
       ${input.origenLat ?? null}, ${input.origenLng ?? null}, ${input.origenFullAddress ?? null},
       ${input.bufferPrepMin ?? 30},
       ${input.rutaIdaGeojson != null ? JSON.stringify(input.rutaIdaGeojson) : null}::jsonb,
       ${input.rutaVueltaGeojson != null ? JSON.stringify(input.rutaVueltaGeojson) : null}::jsonb,
       ${input.bookingShowId ?? null}, ${input.artistId ?? null}, ${input.actorEmail}, now())
    RETURNING *
  `;
  return rowToHoja(rows[0]);
}

export async function updateHoja(id: string, input: HojaInput): Promise<HojaDeRuta | null> {
  await ensureTourManagerSchema();
  const current = await getHoja(id);
  if (!current) return null;
  // Campos "resueltos" (coords/ruta) solo se pisan si el caller los manda
  // explícitamente — así un PATCH parcial (ej. solo cambiar notas) nunca
  // borra un geocoding/ruta ya calculados.
  const venueLat = input.venueLat !== undefined ? input.venueLat : current.venueLat;
  const venueLng = input.venueLng !== undefined ? input.venueLng : current.venueLng;
  const venueFullAddress = input.venueFullAddress !== undefined ? input.venueFullAddress : current.venueFullAddress;
  const venueCiudad = input.venueCiudad !== undefined ? input.venueCiudad : current.venueCiudad;
  const venueProvincia = input.venueProvincia !== undefined ? input.venueProvincia : current.venueProvincia;
  const venuePais = input.venuePais !== undefined ? input.venuePais : current.venuePais;
  const origenLat = input.origenLat !== undefined ? input.origenLat : current.origenLat;
  const origenLng = input.origenLng !== undefined ? input.origenLng : current.origenLng;
  const origenFullAddress = input.origenFullAddress !== undefined ? input.origenFullAddress : current.origenFullAddress;
  const rutaIdaGeojson = input.rutaIdaGeojson !== undefined ? input.rutaIdaGeojson : current.rutaIdaGeojson;
  const rutaVueltaGeojson = input.rutaVueltaGeojson !== undefined ? input.rutaVueltaGeojson : current.rutaVueltaGeojson;
  const bookingShowId = input.bookingShowId !== undefined ? input.bookingShowId : current.bookingShowId;
  const artistId = input.artistId !== undefined ? input.artistId : current.artistId;

  const { rows } = await sql`
    UPDATE tourmanager_hojas SET
      artist_name = ${input.artistName},
      fecha = ${input.fecha}::date,
      hora_show = ${input.horaShow},
      tipo_evento = ${input.tipoEvento},
      venue = ${input.venue},
      venue_direccion = ${input.venueDireccion},
      origen_direccion = ${input.origenDireccion},
      origen_label = ${input.origenLabel},
      distancia_ida_km = ${input.distanciaIdaKm},
      duracion_ida_min = ${input.duracionIdaMin},
      distancia_vuelta_km = ${input.distanciaVueltaKm},
      duracion_vuelta_min = ${input.duracionVueltaMin},
      hora_salida = ${input.horaSalida},
      hora_llegada_venue = ${input.horaLlegadaVenue},
      hora_salida_venue = ${input.horaSalidaVenue},
      hora_llegada_destino = ${input.horaLlegadaDestino},
      duracion_show_min = ${input.duracionShowMin},
      pax = ${input.pax},
      venue_contacto_nombre = ${input.venueContactoNombre},
      venue_contacto_telefono = ${input.venueContactoTelefono},
      contacto_artista_nombre = ${input.contactoArtistaNombre},
      contacto_artista_telefono = ${input.contactoArtistaTelefono},
      artist_liaison_nombre = ${input.artistLiaisonNombre},
      artist_liaison_telefono = ${input.artistLiaisonTelefono},
      driver_nombre = ${input.driverNombre},
      driver_telefono = ${input.driverTelefono},
      running_order = ${input.runningOrder},
      notas = ${input.notas},
      estado = ${input.estado},
      venue_lat = ${venueLat},
      venue_lng = ${venueLng},
      venue_full_address = ${venueFullAddress},
      venue_ciudad = ${venueCiudad},
      venue_provincia = ${venueProvincia},
      venue_pais = ${venuePais},
      origen_lat = ${origenLat},
      origen_lng = ${origenLng},
      origen_full_address = ${origenFullAddress},
      buffer_prep_min = ${input.bufferPrepMin ?? current.bufferPrepMin},
      ruta_ida_geojson = ${rutaIdaGeojson != null ? JSON.stringify(rutaIdaGeojson) : null}::jsonb,
      ruta_vuelta_geojson = ${rutaVueltaGeojson != null ? JSON.stringify(rutaVueltaGeojson) : null}::jsonb,
      booking_show_id = ${bookingShowId},
      artist_id = ${artistId},
      updated_by = ${input.actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToHoja(rows[0]) : null;
}

export async function deleteHoja(id: string): Promise<void> {
  await ensureTourManagerSchema();
  await sql`DELETE FROM tourmanager_hojas WHERE id = ${id}`;
}
