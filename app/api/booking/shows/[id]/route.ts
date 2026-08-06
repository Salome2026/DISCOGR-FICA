import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { updateShow, deleteShow, ESTADOS_SHOW } from "@/lib/db/booking";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
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
    lat,
    lng,
  });
  if (!show) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ show });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await deleteShow(id);
  return NextResponse.json({ ok: true });
}
