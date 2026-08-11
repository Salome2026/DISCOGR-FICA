import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSessionUser } from "@/lib/session";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listPublishingArtists, createPublishingArtist, TIPOS_ARTISTA_PUBLISHING } from "@/lib/db/publishingArtists";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

// GET accepts either the web cookie session or a mobile Bearer token — the
// mobile Publishing module is read-only for now (viewer only), so POST
// stays cookie-only until mobile actually needs to write.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const artists = await listPublishingArtists();
  return NextResponse.json({ artists });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    nombreArtistico, nombreCompleto, apellido, dni, cuil, sadaic, direccion, localidad, provincia, nacionalidad,
    fechaNacimiento, email, telefono, sello, tipo, observaciones, documentoUrl, documentoNombre,
  } = body as Record<string, string | null | undefined>;

  if (!nombreArtistico || !nombreArtistico.trim()) {
    return NextResponse.json({ error: "El nombre artístico es obligatorio." }, { status: 400 });
  }
  if (!tipo || !TIPOS_ARTISTA_PUBLISHING.includes(tipo as (typeof TIPOS_ARTISTA_PUBLISHING)[number])) {
    return NextResponse.json({ error: "Tipo de artista inválido." }, { status: 400 });
  }

  const artist = await createPublishingArtist({
    nombreArtistico: nombreArtistico.trim(),
    nombreCompleto: nombreCompleto || null,
    apellido: apellido || null,
    dni: dni || null,
    cuil: cuil || null,
    sadaic: sadaic || null,
    direccion: direccion || null,
    localidad: localidad || null,
    provincia: provincia || null,
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

  return NextResponse.json({ artist });
}
