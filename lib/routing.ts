// Free, keyless routing via OSRM's public demo server. No SLA, no
// published rate limit, shared public infrastructure — deliberately chosen
// over Google Maps Platform's Distance Matrix API to avoid another paid/
// billing-gated dependency. Only called on explicit user action (save/
// recalculate), never on read, same caching discipline as lib/geocoding.ts
// (the result gets stored on the hoja's row, not re-fetched every view).

export type RouteResult = {
  distanceKm: number;
  durationMin: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DISCOGR-FICA Tour Manager (internal tool, contact: salome@mawzrecords.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const r = data.routes[0];
    return {
      distanceKm: Math.round((r.distance / 1000) * 10) / 10,
      durationMin: Math.round(r.duration / 60),
      geometry: r.geometry,
    };
  } catch {
    return null; // caller falls back to manual entry — a routing outage never blocks saving
  }
}
