import { getMultiLegRoute } from "./routing";
import { buildWaypoints } from "./staticMap";
import type { HojaBody } from "@discografica/shared/types/tourManager";

// Called from the create/update API routes (not inside createHoja/updateHoja
// themselves — those stay pure DB access) right before saving, so the ruta
// completa is always recalculated from whatever coordinates are being saved
// this time. Sequential OSRM legs, same politeness as getRoute() elsewhere —
// a hoja with 4-6 stops means 3-5 legs, a few seconds of extra save time,
// which is an acceptable trade for "siempre actualizado" over a stale route.
export async function computeRutaCompleta(body: Partial<HojaBody>): Promise<unknown | null> {
  const waypoints = buildWaypoints({
    origenFullAddress: body.origenFullAddress ?? null,
    origenDireccion: body.origenDireccion ?? null,
    origenLabel: body.origenLabel ?? null,
    origenLat: body.origenLat ?? null,
    origenLng: body.origenLng ?? null,
    puntoEncuentroNombre: body.puntoEncuentroNombre ?? null,
    puntoEncuentroLat: body.puntoEncuentroLat ?? null,
    puntoEncuentroLng: body.puntoEncuentroLng ?? null,
    busquedaArtistaFullAddress: body.busquedaArtistaFullAddress ?? null,
    busquedaArtistaLat: body.busquedaArtistaLat ?? null,
    busquedaArtistaLng: body.busquedaArtistaLng ?? null,
    venue: body.venue ?? null,
    venueLat: body.venueLat ?? null,
    venueLng: body.venueLng ?? null,
    lugarPruebaSonido: body.lugarPruebaSonido ?? null,
    pruebaSonidoLat: body.pruebaSonidoLat ?? null,
    pruebaSonidoLng: body.pruebaSonidoLng ?? null,
    hotelNombre: body.hotelNombre ?? null,
    hotelLat: body.hotelLat ?? null,
    hotelLng: body.hotelLng ?? null,
    paradas: body.paradas ?? [],
  });

  if (waypoints.length < 2) return null;

  const result = await getMultiLegRoute(waypoints.map((w) => ({ lat: w.lat, lng: w.lng, label: w.label })));
  if (result.coordinates.length === 0) return null;
  return { type: "LineString", coordinates: result.coordinates };
}
