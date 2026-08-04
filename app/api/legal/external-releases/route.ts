import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listExternalReleases, createExternalRelease } from "@/lib/db/externalReleases";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET() {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const releases = await listExternalReleases();
  return NextResponse.json({ releases });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { artist, titulo, selloExterno, fechaLanzamiento, vinculo, documentoUrl, documentoNombre, notas, requiereRevision } = body as {
    artist?: string; titulo?: string; selloExterno?: string | null; fechaLanzamiento?: string | null;
    vinculo?: string | null; documentoUrl?: string | null; documentoNombre?: string | null;
    notas?: string | null; requiereRevision?: boolean;
  };

  if (!artist || !artist.trim()) {
    return NextResponse.json({ error: "El artista es obligatorio." }, { status: 400 });
  }
  if (!titulo || !titulo.trim()) {
    return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
  }

  const release = await createExternalRelease({
    artist: artist.trim(),
    titulo: titulo.trim(),
    selloExterno: selloExterno || null,
    fechaLanzamiento: fechaLanzamiento || null,
    vinculo: vinculo || null,
    documentoUrl: documentoUrl || null,
    documentoNombre: documentoNombre || null,
    notas: notas || null,
    requiereRevision: !!requiereRevision,
    actorEmail: user.email,
  });

  return NextResponse.json({ release });
}
