import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { createSong, listSongs } from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { fonograma, artistPrincipal, colaboradores, productor, autoresCompositores, isrc, comentario } = body as {
    fonograma?: string;
    artistPrincipal?: string | null;
    colaboradores?: string | null;
    productor?: string | null;
    autoresCompositores?: string | null;
    isrc?: string | null;
    comentario?: string | null;
  };

  if (!fonograma || !fonograma.trim()) {
    return NextResponse.json({ error: "El nombre de la canción es obligatorio." }, { status: 400 });
  }

  const existing = await listSongs(id);
  const song = await createSong(
    id,
    {
      trackNumber: existing.length + 1,
      fonograma: fonograma.trim(),
      artistPrincipal: artistPrincipal || null,
      colaboradores: colaboradores || null,
      productor: productor || null,
      autoresCompositores: autoresCompositores || null,
      isrc: isrc || null,
      comentario: comentario || null,
      status: null,
    },
    user.email
  );

  return NextResponse.json({ song });
}
