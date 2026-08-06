// Free, keyless geocoding via OpenStreetMap's Nominatim — used only to
// resolve a show's location into map coordinates. Server-side, low volume
// (one call per show create/edit when the location actually changes),
// results are cached on the row so this never runs on read.
export async function geocodeLocation(
  ciudad: string | null,
  provincia: string | null,
  pais: string | null
): Promise<{ lat: number; lng: number } | null> {
  const parts = [ciudad, provincia, pais].filter(Boolean);
  if (parts.length === 0) return null;
  const q = parts.join(", ");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": "DISCOGR-FICA Booking (internal tool, contact: salome@mawzrecords.com)" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
