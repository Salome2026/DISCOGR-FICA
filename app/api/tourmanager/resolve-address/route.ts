import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { looksLikeGoogleMapsLink, parseGoogleMapsLink } from "@/lib/googleMapsLink";
import { geocodeAddress, reverseGeocode } from "@/lib/geocoding";

// Accepts either a free-text address or a Google Maps share link, resolves
// it to coordinates, then always reverse-geocodes those coordinates too —
// so a pasted Maps link also comes back with a readable address/ciudad/
// provincia/pais, not just a lat/lng pair. Nominatim calls stay sequential
// (never Promise.all'd) per its ~1 req/sec usage policy — this one request
// can already trigger up to 2 Nominatim calls.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { input } = (await req.json()) as { input?: string };
  const text = (input ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Falta la dirección o link." }, { status: 400 });
  }

  let coords: { lat: number; lng: number } | null = null;
  if (looksLikeGoogleMapsLink(text)) {
    coords = await parseGoogleMapsLink(text);
  }
  if (!coords) {
    coords = await geocodeAddress(text);
  }
  if (!coords) {
    return NextResponse.json({ resolved: false });
  }

  const reverse = await reverseGeocode(coords.lat, coords.lng);
  return NextResponse.json({
    resolved: true,
    lat: coords.lat,
    lng: coords.lng,
    fullAddress: reverse?.fullAddress ?? null,
    ciudad: reverse?.ciudad ?? null,
    provincia: reverse?.provincia ?? null,
    pais: reverse?.pais ?? null,
  });
}
