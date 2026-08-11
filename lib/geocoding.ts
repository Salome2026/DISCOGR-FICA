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

// Forward-geocodes a single free-text address string (vs. geocodeLocation's
// ciudad/provincia/pais triplet) — used by Tour Manager's "paste an
// address" path. Nominatim's street-level coverage in Argentina is spotty
// outside major avenues — a null return here is a real, expected outcome,
// not a bug; the caller falls back to manual entry.
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
      headers: { "User-Agent": "DISCOGR-FICA Tour Manager (internal tool, contact: salome@mawzrecords.com)" },
    });
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

export type ReverseGeocodeResult = {
  fullAddress: string;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
};

// Reverse-geocodes coordinates back into a full address + city/province/
// country. Nominatim's `address` object uses inconsistent keys depending on
// place type/locale (confirmed against real Buenos Aires-area coordinates:
// a suburban/airport-area point came back with `village`, not `city`) — try
// each in order rather than assuming one key.
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { "User-Agent": "DISCOGR-FICA Tour Manager (internal tool, contact: salome@mawzrecords.com)" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    const addr = data.address ?? {};
    return {
      fullAddress: (data.display_name as string | undefined) ?? "",
      ciudad: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? null,
      provincia: addr.state ?? null,
      pais: addr.country ?? null,
    };
  } catch {
    return null;
  }
}
