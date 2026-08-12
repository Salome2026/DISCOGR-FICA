import { sql } from "@vercel/postgres";
import { recordAudit } from "./users";

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
      // "Borrar" archiva en vez de eliminar el registro — es información
      // histórica de una gira ya realizada, no un borrador descartable.
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS archived_by TEXT`;

      // Rediseño completo de la hoja de ruta: cada etapa del recorrido con
      // su propio horario + dirección geocodificada, para poder trazar el
      // recorrido completo en el mapa en el orden real del viaje.
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_apertura_puertas TEXT`;

      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS punto_encuentro_nombre TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS punto_encuentro_direccion TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS punto_encuentro_full_address TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS punto_encuentro_lat DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS punto_encuentro_lng DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_encuentro_equipo TEXT`;

      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS direccion_busqueda_artista TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS busqueda_artista_full_address TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS busqueda_artista_lat DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS busqueda_artista_lng DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_busqueda_artista TEXT`;

      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_llegada_ciudad TEXT`;

      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS lugar_prueba_sonido TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS direccion_prueba_sonido TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS prueba_sonido_full_address TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS prueba_sonido_lat DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS prueba_sonido_lng DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_prueba_sonido TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS duracion_prueba_sonido_min INTEGER`;

      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_comida TEXT`;

      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hotel_nombre TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hotel_direccion TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hotel_full_address TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hotel_lat DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hotel_lng DOUBLE PRECISION`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_llegada_hotel TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_checkin TEXT`;
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS hora_checkout TEXT`;

      // Paradas intermedias: cantidad variable, así que van en un array en
      // vez de columnas fijas.
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS paradas JSONB NOT NULL DEFAULT '[]'`;

      // Ruta completa (todas las etapas encadenadas, en orden) — se
      // recalcula al guardar la hoja; el mapa (PNG) se renderiza al vuelo
      // a partir de esto cada vez que se pide (vista "Ver mapa" o PDF), no
      // se guarda un archivo aparte, así nunca queda desactualizado.
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS ruta_completa_geojson JSONB`;

      // Token para el link de "Compartir" (solo lectura, sin login) — nulo
      // hasta que alguien lo comparte por primera vez.
      await sql`ALTER TABLE tourmanager_hojas ADD COLUMN IF NOT EXISTS share_token TEXT`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS tourmanager_hojas_share_token_idx ON tourmanager_hojas (share_token) WHERE share_token IS NOT NULL`;
    })();
  }
  return ready;
}

// Types live in packages/shared (not here) so the Expo mobile app can import
// the exact same HojaDeRuta/HojaInput shapes without dragging in
// @vercel/postgres — this file keeps 100% of the actual DB logic.
export { ESTADOS_HOJA, type HojaDeRuta, type HojaInput, type HojaBody } from "@discografica/shared/types/tourManager";
import type { HojaDeRuta, HojaInput } from "@discografica/shared/types/tourManager";

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
    horaAperturaPuertas: (r.hora_apertura_puertas as string | null) ?? null,
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

    puntoEncuentroNombre: (r.punto_encuentro_nombre as string | null) ?? null,
    puntoEncuentroDireccion: (r.punto_encuentro_direccion as string | null) ?? null,
    puntoEncuentroFullAddress: (r.punto_encuentro_full_address as string | null) ?? null,
    puntoEncuentroLat: (r.punto_encuentro_lat as number | null) ?? null,
    puntoEncuentroLng: (r.punto_encuentro_lng as number | null) ?? null,
    horaEncuentroEquipo: (r.hora_encuentro_equipo as string | null) ?? null,

    direccionBusquedaArtista: (r.direccion_busqueda_artista as string | null) ?? null,
    busquedaArtistaFullAddress: (r.busqueda_artista_full_address as string | null) ?? null,
    busquedaArtistaLat: (r.busqueda_artista_lat as number | null) ?? null,
    busquedaArtistaLng: (r.busqueda_artista_lng as number | null) ?? null,
    horaBusquedaArtista: (r.hora_busqueda_artista as string | null) ?? null,

    horaLlegadaCiudad: (r.hora_llegada_ciudad as string | null) ?? null,

    lugarPruebaSonido: (r.lugar_prueba_sonido as string | null) ?? null,
    direccionPruebaSonido: (r.direccion_prueba_sonido as string | null) ?? null,
    pruebaSonidoFullAddress: (r.prueba_sonido_full_address as string | null) ?? null,
    pruebaSonidoLat: (r.prueba_sonido_lat as number | null) ?? null,
    pruebaSonidoLng: (r.prueba_sonido_lng as number | null) ?? null,
    horaPruebaSonido: (r.hora_prueba_sonido as string | null) ?? null,
    duracionPruebaSonidoMin: (r.duracion_prueba_sonido_min as number | null) ?? null,

    horaComida: (r.hora_comida as string | null) ?? null,

    hotelNombre: (r.hotel_nombre as string | null) ?? null,
    hotelDireccion: (r.hotel_direccion as string | null) ?? null,
    hotelFullAddress: (r.hotel_full_address as string | null) ?? null,
    hotelLat: (r.hotel_lat as number | null) ?? null,
    hotelLng: (r.hotel_lng as number | null) ?? null,
    horaLlegadaHotel: (r.hora_llegada_hotel as string | null) ?? null,
    horaCheckin: (r.hora_checkin as string | null) ?? null,
    horaCheckout: (r.hora_checkout as string | null) ?? null,

    paradas: Array.isArray(r.paradas) ? (r.paradas as HojaDeRuta["paradas"]) : [],

    bufferPrepMin: (r.buffer_prep_min as number) ?? 30,
    rutaIdaGeojson: r.ruta_ida_geojson ?? null,
    rutaVueltaGeojson: r.ruta_vuelta_geojson ?? null,
    rutaCompletaGeojson: r.ruta_completa_geojson ?? null,

    shareToken: (r.share_token as string | null) ?? null,

    bookingShowId: (r.booking_show_id as string | null) ?? null,
    artistId: (r.artist_id as string | null) ?? null,

    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

// Field-by-field diff for the audit trail — only the keys that actually
// changed, so a "modificó la hoja de ruta" entry says something useful
// instead of dumping the whole record on every save.
function diffHoja(before: HojaDeRuta | null, after: HojaDeRuta): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  if (!before) return null;
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  const skip = new Set(["updatedAt", "updatedBy"]);
  for (const key of Object.keys(after) as (keyof HojaDeRuta)[]) {
    if (skip.has(key)) continue;
    const b = JSON.stringify(before[key]);
    const a = JSON.stringify(after[key]);
    if (b !== a) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }
  if (Object.keys(changedAfter).length === 0) return null;
  return { before: changedBefore, after: changedAfter };
}

export async function listHojas(): Promise<HojaDeRuta[]> {
  await ensureTourManagerSchema();
  const { rows } = await sql`SELECT * FROM tourmanager_hojas WHERE archived_at IS NULL ORDER BY fecha ASC, id ASC`;
  return rows.map(rowToHoja);
}

export async function getHoja(id: string): Promise<HojaDeRuta | null> {
  await ensureTourManagerSchema();
  const { rows } = await sql`SELECT * FROM tourmanager_hojas WHERE id = ${id}`;
  return rows[0] ? rowToHoja(rows[0]) : null;
}

export async function createHoja(input: HojaInput): Promise<HojaDeRuta> {
  await ensureTourManagerSchema();
  const id = `hoja-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const paradas = input.paradas ?? [];
  const { rows } = await sql`
    INSERT INTO tourmanager_hojas
      (id, artist_name, fecha, hora_show, hora_apertura_puertas, tipo_evento, venue, venue_direccion, origen_direccion, origen_label,
       distancia_ida_km, duracion_ida_min, distancia_vuelta_km, duracion_vuelta_min,
       hora_salida, hora_llegada_venue, hora_salida_venue, hora_llegada_destino,
       duracion_show_min, pax, venue_contacto_nombre, venue_contacto_telefono,
       contacto_artista_nombre, contacto_artista_telefono, artist_liaison_nombre, artist_liaison_telefono,
       driver_nombre, driver_telefono, running_order, notas, estado,
       venue_lat, venue_lng, venue_full_address, venue_ciudad, venue_provincia, venue_pais,
       origen_lat, origen_lng, origen_full_address,
       punto_encuentro_nombre, punto_encuentro_direccion, punto_encuentro_full_address, punto_encuentro_lat, punto_encuentro_lng, hora_encuentro_equipo,
       direccion_busqueda_artista, busqueda_artista_full_address, busqueda_artista_lat, busqueda_artista_lng, hora_busqueda_artista,
       hora_llegada_ciudad,
       lugar_prueba_sonido, direccion_prueba_sonido, prueba_sonido_full_address, prueba_sonido_lat, prueba_sonido_lng, hora_prueba_sonido, duracion_prueba_sonido_min,
       hora_comida,
       hotel_nombre, hotel_direccion, hotel_full_address, hotel_lat, hotel_lng, hora_llegada_hotel, hora_checkin, hora_checkout,
       paradas,
       buffer_prep_min, ruta_ida_geojson, ruta_vuelta_geojson, ruta_completa_geojson,
       booking_show_id, artist_id, updated_by, updated_at)
    VALUES
      (${id}, ${input.artistName}, ${input.fecha}::date, ${input.horaShow}, ${input.horaAperturaPuertas ?? null}, ${input.tipoEvento}, ${input.venue},
       ${input.venueDireccion}, ${input.origenDireccion}, ${input.origenLabel},
       ${input.distanciaIdaKm}, ${input.duracionIdaMin}, ${input.distanciaVueltaKm}, ${input.duracionVueltaMin},
       ${input.horaSalida}, ${input.horaLlegadaVenue}, ${input.horaSalidaVenue}, ${input.horaLlegadaDestino},
       ${input.duracionShowMin}, ${input.pax}, ${input.venueContactoNombre}, ${input.venueContactoTelefono},
       ${input.contactoArtistaNombre}, ${input.contactoArtistaTelefono}, ${input.artistLiaisonNombre}, ${input.artistLiaisonTelefono},
       ${input.driverNombre}, ${input.driverTelefono}, ${input.runningOrder}, ${input.notas}, ${input.estado},
       ${input.venueLat ?? null}, ${input.venueLng ?? null}, ${input.venueFullAddress ?? null},
       ${input.venueCiudad ?? null}, ${input.venueProvincia ?? null}, ${input.venuePais ?? null},
       ${input.origenLat ?? null}, ${input.origenLng ?? null}, ${input.origenFullAddress ?? null},
       ${input.puntoEncuentroNombre ?? null}, ${input.puntoEncuentroDireccion ?? null}, ${input.puntoEncuentroFullAddress ?? null},
       ${input.puntoEncuentroLat ?? null}, ${input.puntoEncuentroLng ?? null}, ${input.horaEncuentroEquipo ?? null},
       ${input.direccionBusquedaArtista ?? null}, ${input.busquedaArtistaFullAddress ?? null},
       ${input.busquedaArtistaLat ?? null}, ${input.busquedaArtistaLng ?? null}, ${input.horaBusquedaArtista ?? null},
       ${input.horaLlegadaCiudad ?? null},
       ${input.lugarPruebaSonido ?? null}, ${input.direccionPruebaSonido ?? null}, ${input.pruebaSonidoFullAddress ?? null},
       ${input.pruebaSonidoLat ?? null}, ${input.pruebaSonidoLng ?? null}, ${input.horaPruebaSonido ?? null}, ${input.duracionPruebaSonidoMin ?? null},
       ${input.horaComida ?? null},
       ${input.hotelNombre ?? null}, ${input.hotelDireccion ?? null}, ${input.hotelFullAddress ?? null},
       ${input.hotelLat ?? null}, ${input.hotelLng ?? null}, ${input.horaLlegadaHotel ?? null}, ${input.horaCheckin ?? null}, ${input.horaCheckout ?? null},
       ${JSON.stringify(paradas)}::jsonb,
       ${input.bufferPrepMin ?? 30},
       ${input.rutaIdaGeojson != null ? JSON.stringify(input.rutaIdaGeojson) : null}::jsonb,
       ${input.rutaVueltaGeojson != null ? JSON.stringify(input.rutaVueltaGeojson) : null}::jsonb,
       ${input.rutaCompletaGeojson != null ? JSON.stringify(input.rutaCompletaGeojson) : null}::jsonb,
       ${input.bookingShowId ?? null}, ${input.artistId ?? null}, ${input.actorEmail}, now())
    RETURNING *
  `;
  const hoja = rowToHoja(rows[0]);
  await recordAudit({ actorEmail: input.actorEmail, action: "hoja_creada", entityType: "tourmanager_hoja", entityId: hoja.id, after: hoja });
  return hoja;
}

export async function updateHoja(id: string, input: HojaInput): Promise<HojaDeRuta | null> {
  await ensureTourManagerSchema();
  const current = await getHoja(id);
  if (!current) return null;
  // Campos "resueltos" (coords/ruta/mapa) solo se pisan si el caller los
  // manda explícitamente — así un PATCH parcial (ej. solo cambiar notas)
  // nunca borra un geocoding/ruta/mapa ya calculados.
  const venueLat = input.venueLat !== undefined ? input.venueLat : current.venueLat;
  const venueLng = input.venueLng !== undefined ? input.venueLng : current.venueLng;
  const venueFullAddress = input.venueFullAddress !== undefined ? input.venueFullAddress : current.venueFullAddress;
  const venueCiudad = input.venueCiudad !== undefined ? input.venueCiudad : current.venueCiudad;
  const venueProvincia = input.venueProvincia !== undefined ? input.venueProvincia : current.venueProvincia;
  const venuePais = input.venuePais !== undefined ? input.venuePais : current.venuePais;
  const origenLat = input.origenLat !== undefined ? input.origenLat : current.origenLat;
  const origenLng = input.origenLng !== undefined ? input.origenLng : current.origenLng;
  const origenFullAddress = input.origenFullAddress !== undefined ? input.origenFullAddress : current.origenFullAddress;
  const puntoEncuentroFullAddress = input.puntoEncuentroFullAddress !== undefined ? input.puntoEncuentroFullAddress : current.puntoEncuentroFullAddress;
  const puntoEncuentroLat = input.puntoEncuentroLat !== undefined ? input.puntoEncuentroLat : current.puntoEncuentroLat;
  const puntoEncuentroLng = input.puntoEncuentroLng !== undefined ? input.puntoEncuentroLng : current.puntoEncuentroLng;
  const busquedaArtistaFullAddress = input.busquedaArtistaFullAddress !== undefined ? input.busquedaArtistaFullAddress : current.busquedaArtistaFullAddress;
  const busquedaArtistaLat = input.busquedaArtistaLat !== undefined ? input.busquedaArtistaLat : current.busquedaArtistaLat;
  const busquedaArtistaLng = input.busquedaArtistaLng !== undefined ? input.busquedaArtistaLng : current.busquedaArtistaLng;
  const pruebaSonidoFullAddress = input.pruebaSonidoFullAddress !== undefined ? input.pruebaSonidoFullAddress : current.pruebaSonidoFullAddress;
  const pruebaSonidoLat = input.pruebaSonidoLat !== undefined ? input.pruebaSonidoLat : current.pruebaSonidoLat;
  const pruebaSonidoLng = input.pruebaSonidoLng !== undefined ? input.pruebaSonidoLng : current.pruebaSonidoLng;
  const hotelFullAddress = input.hotelFullAddress !== undefined ? input.hotelFullAddress : current.hotelFullAddress;
  const hotelLat = input.hotelLat !== undefined ? input.hotelLat : current.hotelLat;
  const hotelLng = input.hotelLng !== undefined ? input.hotelLng : current.hotelLng;
  const paradas = input.paradas !== undefined ? input.paradas : current.paradas;
  const rutaIdaGeojson = input.rutaIdaGeojson !== undefined ? input.rutaIdaGeojson : current.rutaIdaGeojson;
  const rutaVueltaGeojson = input.rutaVueltaGeojson !== undefined ? input.rutaVueltaGeojson : current.rutaVueltaGeojson;
  const rutaCompletaGeojson = input.rutaCompletaGeojson !== undefined ? input.rutaCompletaGeojson : current.rutaCompletaGeojson;
  const bookingShowId = input.bookingShowId !== undefined ? input.bookingShowId : current.bookingShowId;
  const artistId = input.artistId !== undefined ? input.artistId : current.artistId;

  const { rows } = await sql`
    UPDATE tourmanager_hojas SET
      artist_name = ${input.artistName},
      fecha = ${input.fecha}::date,
      hora_show = ${input.horaShow},
      hora_apertura_puertas = ${input.horaAperturaPuertas ?? null},
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
      punto_encuentro_nombre = ${input.puntoEncuentroNombre ?? null},
      punto_encuentro_direccion = ${input.puntoEncuentroDireccion ?? null},
      punto_encuentro_full_address = ${puntoEncuentroFullAddress},
      punto_encuentro_lat = ${puntoEncuentroLat},
      punto_encuentro_lng = ${puntoEncuentroLng},
      hora_encuentro_equipo = ${input.horaEncuentroEquipo ?? null},
      direccion_busqueda_artista = ${input.direccionBusquedaArtista ?? null},
      busqueda_artista_full_address = ${busquedaArtistaFullAddress},
      busqueda_artista_lat = ${busquedaArtistaLat},
      busqueda_artista_lng = ${busquedaArtistaLng},
      hora_busqueda_artista = ${input.horaBusquedaArtista ?? null},
      hora_llegada_ciudad = ${input.horaLlegadaCiudad ?? null},
      lugar_prueba_sonido = ${input.lugarPruebaSonido ?? null},
      direccion_prueba_sonido = ${input.direccionPruebaSonido ?? null},
      prueba_sonido_full_address = ${pruebaSonidoFullAddress},
      prueba_sonido_lat = ${pruebaSonidoLat},
      prueba_sonido_lng = ${pruebaSonidoLng},
      hora_prueba_sonido = ${input.horaPruebaSonido ?? null},
      duracion_prueba_sonido_min = ${input.duracionPruebaSonidoMin ?? null},
      hora_comida = ${input.horaComida ?? null},
      hotel_nombre = ${input.hotelNombre ?? null},
      hotel_direccion = ${input.hotelDireccion ?? null},
      hotel_full_address = ${hotelFullAddress},
      hotel_lat = ${hotelLat},
      hotel_lng = ${hotelLng},
      hora_llegada_hotel = ${input.horaLlegadaHotel ?? null},
      hora_checkin = ${input.horaCheckin ?? null},
      hora_checkout = ${input.horaCheckout ?? null},
      paradas = ${JSON.stringify(paradas)}::jsonb,
      buffer_prep_min = ${input.bufferPrepMin ?? current.bufferPrepMin},
      ruta_ida_geojson = ${rutaIdaGeojson != null ? JSON.stringify(rutaIdaGeojson) : null}::jsonb,
      ruta_vuelta_geojson = ${rutaVueltaGeojson != null ? JSON.stringify(rutaVueltaGeojson) : null}::jsonb,
      ruta_completa_geojson = ${rutaCompletaGeojson != null ? JSON.stringify(rutaCompletaGeojson) : null}::jsonb,
      booking_show_id = ${bookingShowId},
      artist_id = ${artistId},
      updated_by = ${input.actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return null;
  const hoja = rowToHoja(rows[0]);
  const diff = diffHoja(current, hoja);
  if (diff) {
    await recordAudit({ actorEmail: input.actorEmail, action: "hoja_modificada", entityType: "tourmanager_hoja", entityId: id, before: diff.before, after: diff.after });
  }
  return hoja;
}

export async function deleteHoja(id: string, actorEmail: string): Promise<void> {
  await ensureTourManagerSchema();
  await sql`UPDATE tourmanager_hojas SET archived_at = now(), archived_by = ${actorEmail} WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "hoja_archived", entityType: "tourmanager_hoja", entityId: id });
}

// Clona una hoja existente como punto de partida para una nueva — útil
// para giras con fechas consecutivas, el mismo hotel, el mismo equipo.
// La copia nace en Borrador, sin mapa/ruta (dependen del origen/fecha,
// que la persona va a querer revisar igual) y sin token de compartir
// propio.
export async function duplicateHoja(id: string, actorEmail: string): Promise<HojaDeRuta | null> {
  await ensureTourManagerSchema();
  const source = await getHoja(id);
  if (!source) return null;
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, updatedBy: _updatedBy, shareToken: _shareToken, rutaCompletaGeojson: _rutaCompletaGeojson, ...rest } = source;
  return createHoja({ ...rest, estado: "Borrador", actorEmail });
}

export async function setShareToken(id: string): Promise<string | null> {
  await ensureTourManagerSchema();
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const { rows } = await sql`UPDATE tourmanager_hojas SET share_token = ${token} WHERE id = ${id} RETURNING share_token`;
  return rows[0]?.share_token ?? null;
}

export async function getHojaByShareToken(token: string): Promise<HojaDeRuta | null> {
  await ensureTourManagerSchema();
  const { rows } = await sql`SELECT * FROM tourmanager_hojas WHERE share_token = ${token} AND archived_at IS NULL`;
  return rows[0] ? rowToHoja(rows[0]) : null;
}
