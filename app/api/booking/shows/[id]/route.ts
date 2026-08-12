import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { updateShow, deleteShow, getShow, ESTADOS_SHOW } from "@/lib/db/booking";
import { geocodeLocation } from "@/lib/geocoding";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const show = await getShow(id);
  if (!show) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ show });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { artistName, fecha, hora, venue, ciudad, provincia, pais, estado, contactoId, notas, lat, lng } = body as {
    artistName?: string;
    fecha?: string;
    hora?: string | null;
    venue?: string | null;
    ciudad?: string | null;
    provincia?: string | null;
    pais?: string | null;
    estado?: string;
    contactoId?: string | null;
    notas?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  if (!artistName || !fecha) {
    return NextResponse.json({ error: "Faltan campos obligatorios: artista y fecha." }, { status: 400 });
  }
  if (estado && !ESTADOS_SHOW.includes(estado as (typeof ESTADOS_SHOW)[number])) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  // Only re-geocode when the location text actually changed, or when the
  // caller sent an explicit manual override — avoids a repeat Nominatim
  // call on every unrelated edit (estado, notas, etc.).
  let resolvedLat = lat;
  let resolvedLng = lng;
  if (lat === undefined && lng === undefined) {
    const current = await getShow(id);
    const locationChanged =
      current && (current.ciudad !== (ciudad || null) || current.provincia !== (provincia || null) || current.pais !== (pais || null));
    if (locationChanged && (ciudad || provincia || pais)) {
      const coords = await geocodeLocation(ciudad ?? null, provincia ?? null, pais ?? null);
      resolvedLat = coords?.lat ?? null;
      resolvedLng = coords?.lng ?? null;
    }
  }

  const show = await updateShow(id, {
    artistName,
    fecha,
    hora: hora || null,
    venue: venue || null,
    ciudad: ciudad || null,
    provincia: provincia || null,
    pais: pais || null,
    estado: estado || "Pendiente",
    contactoId: contactoId || null,
    notas: notas || null,
    createdBy: user.email,
    lat: resolvedLat,
    lng: resolvedLng,
  });
  if (!show) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ show });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await deleteShow(id, user.email);
  return NextResponse.json({ ok: true });
}
