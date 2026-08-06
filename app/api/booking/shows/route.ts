import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listShows, createShow, ESTADOS_SHOW } from "@/lib/db/booking";
import { geocodeLocation } from "@/lib/geocoding";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET() {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const shows = await listShows();
  return NextResponse.json({ shows });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const { artistName, fecha, hora, venue, ciudad, provincia, pais, estado, contactoId, notas } = body as {
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
  };
  if (!artistName || !fecha) {
    return NextResponse.json({ error: "Faltan campos obligatorios: artista y fecha." }, { status: 400 });
  }
  if (estado && !ESTADOS_SHOW.includes(estado as (typeof ESTADOS_SHOW)[number])) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const coords = ciudad || provincia || pais ? await geocodeLocation(ciudad ?? null, provincia ?? null, pais ?? null) : null;

  const show = await createShow({
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
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  });
  return NextResponse.json({ show });
}
