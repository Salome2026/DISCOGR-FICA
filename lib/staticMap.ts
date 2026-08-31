import sharp from "sharp";

// Renders a static PNG of the full route — same free OpenStreetMap tiles the
// interactive Leaflet map already uses (app/panel/tourmanager/RouteMap.tsx),
// stitched server-side with sharp instead of a browser. This is what makes
// "el mapa debe aparecer arriba de todo en el PDF, sin depender de abrir
// enlaces externos" possible — @react-pdf/renderer can only embed a raster
// image, never a live map component.
//
// CARTO's free dark_all basemap tiles started requiring an API key
// (basemaps.cartocdn.com now returns an "API KEY REQUIRED" watermark
// instead of real tiles) — switched to standard OSM tiles, which stay
// genuinely free with no account. OSM's tiles are a light basemap, not
// dark, so the composited PNG gets negated at the end to approximate the
// same dark look the rest of the app/PDF uses (same trick as the CSS
// `filter: invert(1) hue-rotate(180deg)` applied to the interactive map).

const TILE_SIZE = 256;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 640;
const MAX_ZOOM = 17;

function lonToWorldX(lon: number, z: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** z;
}
function latToWorldY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE_SIZE * 2 ** z;
}

function chooseZoom(minLat: number, maxLat: number, minLon: number, maxLon: number): number {
  for (let z = MAX_ZOOM; z >= 0; z--) {
    const spanX = lonToWorldX(maxLon, z) - lonToWorldX(minLon, z);
    const spanY = latToWorldY(minLat, z) - latToWorldY(maxLat, z);
    if (spanX <= CANVAS_WIDTH * 0.82 && spanY <= CANVAS_HEIGHT * 0.82) return z;
  }
  return 0;
}

async function fetchTile(z: number, x: number, y: number): Promise<Buffer | null> {
  const max = 2 ** z;
  const wrappedX = ((x % max) + max) % max;
  if (y < 0 || y >= max) return null;
  try {
    const res = await fetch(`https://a.tile.openstreetmap.org/${z}/${wrappedX}/${y}.png`, {
      headers: { "User-Agent": "DISCOGR-FICA Tour Manager (internal tool, contact: salome@mawzrecords.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type StaticMapPoint = { lat: number; lng: number; label: string; kind: "start" | "end" | "stop" };

// input.waypoints drives the numbered markers (in travel order); input.route
// is the actual road geometry to draw as the path — they're separate because
// a leg OSRM couldn't resolve still gets its marker, just no line segment.
export async function renderStaticRouteMap(input: {
  waypoints: StaticMapPoint[];
  routeCoordinates: [number, number][]; // [lng, lat], as returned by OSRM/getMultiLegRoute
}): Promise<Buffer | null> {
  const points = input.waypoints.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (points.length === 0) return null;

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lng);
  const latPad = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.15, 0.01);
  const lonPad = Math.max((Math.max(...lons) - Math.min(...lons)) * 0.15, 0.01);
  const minLat = Math.min(...lats) - latPad;
  const maxLat = Math.max(...lats) + latPad;
  const minLon = Math.min(...lons) - lonPad;
  const maxLon = Math.max(...lons) + lonPad;

  const zoom = chooseZoom(minLat, maxLat, minLon, maxLon);

  const centerWorldX = (lonToWorldX(minLon, zoom) + lonToWorldX(maxLon, zoom)) / 2;
  const centerWorldY = (latToWorldY(minLat, zoom) + latToWorldY(maxLat, zoom)) / 2;
  const originX = centerWorldX - CANVAS_WIDTH / 2;
  const originY = centerWorldY - CANVAS_HEIGHT / 2;

  const toCanvas = (lat: number, lon: number) => ({
    x: lonToWorldX(lon, zoom) - originX,
    y: latToWorldY(lat, zoom) - originY,
  });

  const tileXStart = Math.floor(originX / TILE_SIZE);
  const tileXEnd = Math.floor((originX + CANVAS_WIDTH) / TILE_SIZE);
  const tileYStart = Math.floor(originY / TILE_SIZE);
  const tileYEnd = Math.floor((originY + CANVAS_HEIGHT) / TILE_SIZE);

  const tileJobs: { x: number; y: number }[] = [];
  for (let tx = tileXStart; tx <= tileXEnd; tx++) {
    for (let ty = tileYStart; ty <= tileYEnd; ty++) {
      tileJobs.push({ x: tx, y: ty });
    }
  }
  const tileBuffers = await Promise.all(tileJobs.map((t) => fetchTile(zoom, t.x, t.y)));

  const tileComposites: { input: Buffer; left: number; top: number }[] = [];
  tileJobs.forEach((t, i) => {
    const buf = tileBuffers[i];
    if (!buf) return;
    tileComposites.push({ input: buf, left: Math.round(t.x * TILE_SIZE - originX), top: Math.round(t.y * TILE_SIZE - originY) });
  });
  // Negate just the light OSM tiles into a dark basemap — the route line
  // and marker colors below are already correct for a dark background and
  // must be composited afterward, untouched, or they'd get inverted too.
  const darkTiles = await sharp({
    create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: { r: 10, g: 10, b: 12, alpha: 1 } },
  })
    .composite(tileComposites)
    .negate({ alpha: false })
    .png()
    .toBuffer();

  // Route line first (under the markers), then numbered markers on top —
  // same visual language as the interactive map (accent teal line, start
  // green, end red, everything else a numbered accent dot).
  const routePoints = input.routeCoordinates.map(([lng, lat]) => toCanvas(lat, lng));
  const routePath = routePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const markers = points
    .map((p, i) => {
      const { x, y } = toCanvas(p.lat, p.lng);
      const fill = p.kind === "start" ? "#3fc6d1" : p.kind === "end" ? "#e5484d" : "#f4f4f5";
      const textFill = p.kind === "stop" ? "#111114" : "#00181a";
      const label = p.kind === "start" ? "A" : p.kind === "end" ? "B" : String(i);
      return `
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="${fill}" stroke="#0a0a0c" stroke-width="2.5" />
        <text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" font-size="12" font-weight="700" text-anchor="middle" fill="${textFill}" font-family="Helvetica, Arial, sans-serif">${label}</text>
        <text x="${x.toFixed(1)}" y="${(y + 26).toFixed(1)}" font-size="12" text-anchor="middle" fill="#f4f4f5" font-family="Helvetica, Arial, sans-serif" style="paint-order: stroke; stroke: #0a0a0c; stroke-width: 3px;">${escapeXml(p.label).slice(0, 24)}</text>
      `;
    })
    .join("");

  const svg = `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${routePoints.length > 1 ? `<polyline points="${routePath}" fill="none" stroke="#3fc6d1" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.92" />` : ""}
      ${markers}
    </svg>
  `;
  const png = await sharp(darkTiles)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toBuffer();

  return png;
}

// Builds the ordered waypoint list + combined route from a hoja, ready to
// hand to renderStaticRouteMap — shared by the PDF route and the "Ver mapa"
// preview route so both always draw the exact same map. Rendered fresh on
// every request from the hoja's stored coordinates/ruta_completa_geojson
// (not cached as a file) — that's what makes it always current: change an
// address and save, and the very next PDF/preview reflects it.
export function buildWaypoints(hoja: {
  origenFullAddress: string | null;
  origenDireccion: string | null;
  origenLabel: string | null;
  origenLat: number | null;
  origenLng: number | null;
  puntoEncuentroNombre: string | null;
  puntoEncuentroLat: number | null;
  puntoEncuentroLng: number | null;
  busquedaArtistaFullAddress: string | null;
  busquedaArtistaLat: number | null;
  busquedaArtistaLng: number | null;
  venue: string | null;
  venueLat: number | null;
  venueLng: number | null;
  lugarPruebaSonido: string | null;
  pruebaSonidoLat: number | null;
  pruebaSonidoLng: number | null;
  hotelNombre: string | null;
  hotelLat: number | null;
  hotelLng: number | null;
  paradas: { nombre: string; lat: number | null; lng: number | null }[];
}): StaticMapPoint[] {
  const points: StaticMapPoint[] = [];
  const has = (lat: number | null, lng: number | null) => lat != null && lng != null;

  if (has(hoja.origenLat, hoja.origenLng)) {
    points.push({ lat: hoja.origenLat as number, lng: hoja.origenLng as number, label: hoja.origenLabel || "Salida", kind: "start" });
  }
  if (has(hoja.puntoEncuentroLat, hoja.puntoEncuentroLng)) {
    points.push({ lat: hoja.puntoEncuentroLat as number, lng: hoja.puntoEncuentroLng as number, label: hoja.puntoEncuentroNombre || "Punto de encuentro", kind: "stop" });
  }
  if (has(hoja.busquedaArtistaLat, hoja.busquedaArtistaLng)) {
    points.push({ lat: hoja.busquedaArtistaLat as number, lng: hoja.busquedaArtistaLng as number, label: "Búsqueda del artista", kind: "stop" });
  }
  if (has(hoja.venueLat, hoja.venueLng)) {
    points.push({ lat: hoja.venueLat as number, lng: hoja.venueLng as number, label: hoja.venue || "Show", kind: "stop" });
  }
  // Prueba de sonido solo suma un punto propio si tiene coordenadas
  // distintas al venue — si comparte dirección, ya está representado.
  if (
    has(hoja.pruebaSonidoLat, hoja.pruebaSonidoLng) &&
    (hoja.pruebaSonidoLat !== hoja.venueLat || hoja.pruebaSonidoLng !== hoja.venueLng)
  ) {
    points.push({ lat: hoja.pruebaSonidoLat as number, lng: hoja.pruebaSonidoLng as number, label: hoja.lugarPruebaSonido || "Prueba de sonido", kind: "stop" });
  }
  if (has(hoja.hotelLat, hoja.hotelLng)) {
    points.push({ lat: hoja.hotelLat as number, lng: hoja.hotelLng as number, label: hoja.hotelNombre || "Hotel", kind: "stop" });
  }
  for (const parada of hoja.paradas) {
    if (has(parada.lat, parada.lng)) {
      points.push({ lat: parada.lat as number, lng: parada.lng as number, label: parada.nombre || "Parada", kind: "stop" });
    }
  }
  // Vuelta al origen (regreso) — mismo punto que la salida, pero marcado
  // como destino final en vez de repetir el marcador de salida.
  if (has(hoja.origenLat, hoja.origenLng) && points.length > 1) {
    points.push({ lat: hoja.origenLat as number, lng: hoja.origenLng as number, label: "Regreso", kind: "end" });
  } else if (points.length > 0) {
    points[points.length - 1] = { ...points[points.length - 1], kind: "end" };
  }

  return points;
}
