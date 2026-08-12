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

export type Waypoint = { lat: number; lng: number; label: string };

export type MultiLegRoute = {
  distanceKm: number;
  durationMin: number;
  // One continuous line through every leg that actually resolved — used to
  // draw the full path on the map. Legs that failed to route (OSRM outage,
  // no road found) are simply skipped, never block the rest.
  coordinates: [number, number][];
  legsResolved: number;
  legsTotal: number;
};

// Chains getRoute() across an ordered list of stops — origen -> encuentro ->
// búsqueda del artista -> venue -> ... -> regreso. Sequential, not
// Promise.all: OSRM's public demo server has no published rate limit, and
// hammering it with N parallel requests for one PDF is the kind of thing
// that gets an IP soft-blocked. A few seconds of extra latency here is a
// fair trade against risking the whole routing feature for every user.
export async function getMultiLegRoute(waypoints: Waypoint[]): Promise<MultiLegRoute> {
  let distanceKm = 0;
  let durationMin = 0;
  let legsResolved = 0;
  const coordinates: [number, number][] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = await getRoute(waypoints[i], waypoints[i + 1]);
    if (!leg) continue;
    distanceKm += leg.distanceKm;
    durationMin += leg.durationMin;
    legsResolved++;
    // Avoid a duplicate point where one leg's end meets the next leg's start.
    const coords = coordinates.length > 0 ? leg.geometry.coordinates.slice(1) : leg.geometry.coordinates;
    coordinates.push(...coords);
  }

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.round(durationMin),
    coordinates,
    legsResolved,
    legsTotal: waypoints.length - 1,
  };
}
