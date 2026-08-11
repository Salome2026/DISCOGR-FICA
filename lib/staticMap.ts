import sharp from "sharp";

// Server-side static map for the hoja de ruta PDF — no Google Maps API, no key,
// no billing dependency (same CARTO free tile server Fase 5's interactive Leaflet
// map already uses). Stitches raster tiles with sharp, then composites an SVG
// overlay (markers + route line) on top. Every failure path returns null instead
// of throwing — a broken/slow tile fetch must never block PDF generation.

const TILE_URL = (z: number, x: number, y: number) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
const TILE_SIZE = 256;
const MIN_ZOOM = 4;
const MAX_ZOOM = 17;

type LatLng = { lat: number; lng: number };

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom) * TILE_SIZE;
}
function latToWorldY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom) * TILE_SIZE;
}

function geojsonToLatLngs(geojson: unknown): LatLng[] {
  const coords = (geojson as { coordinates?: [number, number][] } | null)?.coordinates;
  if (!Array.isArray(coords)) return [];
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

// Highest zoom where every point's world-pixel position still fits inside the
// canvas (with padding) — the "fit bounds" a real map does when framing a route.
function pickZoom(points: LatLng[], width: number, height: number, padding: number): number {
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom--) {
    const xs = points.map((p) => lonToWorldX(p.lng, zoom));
    const ys = points.map((p) => latToWorldY(p.lat, zoom));
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX <= width - padding * 2 && spanY <= height - padding * 2) return zoom;
  }
  return MIN_ZOOM;
}

export async function buildStaticMapPng(input: {
  origin?: LatLng | null;
  venue?: LatLng | null;
  routeGeojson?: unknown;
  width?: number;
  height?: number;
}): Promise<Buffer | null> {
  const width = input.width ?? 600;
  const height = input.height ?? 320;
  const padding = 36;

  const routeLine = geojsonToLatLngs(input.routeGeojson);
  const points: LatLng[] = [
    ...(input.origin ? [input.origin] : []),
    ...(input.venue ? [input.venue] : []),
    ...routeLine,
  ];
  if (points.length === 0) return null;

  try {
    const zoom = points.length > 1 ? pickZoom(points, width, height, padding) : 14;
    const xs = points.map((p) => lonToWorldX(p.lng, zoom));
    const ys = points.map((p) => latToWorldY(p.lat, zoom));
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    // Top-left world-pixel corner of the crop we actually want to show.
    const originX = centerX - width / 2;
    const originY = centerY - height / 2;

    const firstTileX = Math.floor(originX / TILE_SIZE);
    const firstTileY = Math.floor(originY / TILE_SIZE);
    const lastTileX = Math.floor((originX + width) / TILE_SIZE);
    const lastTileY = Math.floor((originY + height) / TILE_SIZE);
    const tileCols = lastTileX - firstTileX + 1;
    const tileRows = lastTileY - firstTileY + 1;
    const maxTile = Math.pow(2, zoom);

    const fetchTile = (tx: number, ty: number) =>
      fetch(TILE_URL(zoom, ((tx % maxTile) + maxTile) % maxTile, ty), {
        headers: { "User-Agent": "DISCOGR-FICA Tour Manager (internal tool, contact: salome@mawzrecords.com)" },
        signal: AbortSignal.timeout(6000),
      })
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => (buf ? Buffer.from(buf) : null))
        .catch(() => null);

    const tileCoords: { tx: number; ty: number }[] = [];
    for (let ty = firstTileY; ty <= lastTileY; ty++) {
      for (let tx = firstTileX; tx <= lastTileX; tx++) tileCoords.push({ tx, ty });
    }
    const tileBuffers = await Promise.all(tileCoords.map((t) => fetchTile(t.tx, t.ty)));

    const mosaicWidth = tileCols * TILE_SIZE;
    const mosaicHeight = tileRows * TILE_SIZE;
    const composites: { input: Buffer; left: number; top: number }[] = [];
    tileCoords.forEach((t, i) => {
      const buf = tileBuffers[i];
      if (buf) composites.push({ input: buf, left: (t.tx - firstTileX) * TILE_SIZE, top: (t.ty - firstTileY) * TILE_SIZE });
    });

    if (composites.length === 0) return null; // every tile fetch failed — no point in a blank map

    // World-pixel -> position within the mosaic, for the SVG overlay below.
    const toMosaicPoint = (p: LatLng) => ({
      x: lonToWorldX(p.lng, zoom) - firstTileX * TILE_SIZE,
      y: latToWorldY(p.lat, zoom) - firstTileY * TILE_SIZE,
    });

    const routeSvgPoints = routeLine.map(toMosaicPoint);
    const routePath = routeSvgPoints.length > 1
      ? `<polyline points="${routeSvgPoints.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="#3fc6d1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />`
      : "";
    const originMarker = input.origin
      ? markerSvg(toMosaicPoint(input.origin), "#3fc6d1")
      : "";
    const venueMarker = input.venue
      ? markerSvg(toMosaicPoint(input.venue), "#e5484d")
      : "";
    const overlaySvg = `<svg width="${mosaicWidth}" height="${mosaicHeight}" xmlns="http://www.w3.org/2000/svg">${routePath}${originMarker}${venueMarker}</svg>`;
    // librsvg doesn't guarantee the rasterized SVG comes out at exactly the
    // declared width/height (rounding) — sharp's composite() rejects an
    // overlay even 1px larger than the base, so force the exact pixel size
    // before compositing instead of trusting the SVG's own dimensions.
    const overlayPng = await sharp(Buffer.from(overlaySvg))
      .resize(mosaicWidth, mosaicHeight, { fit: "fill" })
      .png()
      .toBuffer();

    const cropLeft = Math.round(originX - firstTileX * TILE_SIZE);
    const cropTop = Math.round(originY - firstTileY * TILE_SIZE);

    // Composite and crop in two separate sharp() calls, not chained — sharp's
    // pipeline planner can apply an extract() that follows composite() in the
    // same chain before the composite finishes, which then rejects the
    // full-size overlay as "larger than" the already-shrunk canvas. Forcing
    // the composite to materialize into a buffer first avoids that reordering.
    const composited = await sharp({ create: { width: mosaicWidth, height: mosaicHeight, channels: 3, background: "#0c0c0e" } })
      .composite([...composites, { input: overlayPng, left: 0, top: 0 }])
      .png()
      .toBuffer();

    return await sharp(composited)
      .extract({
        left: Math.max(0, Math.min(cropLeft, mosaicWidth - width)),
        top: Math.max(0, Math.min(cropTop, mosaicHeight - height)),
        width: Math.min(width, mosaicWidth),
        height: Math.min(height, mosaicHeight),
      })
      .png()
      .toBuffer();
  } catch {
    return null; // caller falls back to the text-only distances block — a map outage never blocks the PDF
  }
}

function markerSvg(p: { x: number; y: number }, color: string): string {
  return `<g transform="translate(${p.x},${p.y})">
    <path d="M0 -22C-6.6 -22 -12 -16.6 -12 -10C-12 -0.5 0 12 0 12S12 -0.5 12 -10C12 -16.6 6.6 -22 0 -22Z" fill="${color}" stroke="#0c0c0e" stroke-width="1.5" />
    <circle cx="0" cy="-10" r="4.5" fill="#0c0c0e" />
  </g>`;
}
