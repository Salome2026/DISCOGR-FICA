import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { getPublishingArtist, updatePublishingArtist, TIPOS_ARTISTA_PUBLISHING } from "@/lib/db/publishingArtists";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const artist = await getPublishingArtist(id);
  if (!artist) return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });
  return NextResponse.json({ artist });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const {
    nombreArtistico, nombreCompleto, apellido, dni, sadaic, direccion, nacionalidad,
    fechaNacimiento, email, telefono, sello, tipo, observaciones, documentoUrl, documentoNombre,
  } = body as Record<string, string | null | undefined>;

  if (!nombreArtistico || !nombreArtistico.trim()) {
    return NextResponse.json({ error: "El nombre artístico es obligatorio." }, { status: 400 });
  }
  if (!tipo || !TIPOS_ARTISTA_PUBLISHING.includes(tipo as (typeof TIPOS_ARTISTA_PUBLISHING)[number])) {
    return NextResponse.json({ error: "Tipo de artista inválido." }, { status: 400 });
  }

  const artist = await updatePublishingArtist(id, {
    nombreArtistico: nombreArtistico.trim(),
    nombreCompleto: nombreCompleto || null,
    apellido: apellido || null,
    dni: dni || null,
    sadaic: sadaic || null,
    direccion: direccion || null,
    nacionalidad: nacionalidad || null,
    fechaNacimiento: fechaNacimiento || null,
    email: email || null,
    telefono: telefono || null,
    sello: sello || null,
    tipo,
    observaciones: observaciones || null,
    documentoUrl: documentoUrl || null,
    documentoNombre: documentoNombre || null,
    actorEmail: user.email,
  });

  if (!artist) return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });
  return NextResponse.json({ artist });
}
