import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { updateSong, setSongStatus, deleteSong } from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; songId: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { songId } = await params;
  const id = Number(songId);
  const body = await req.json();
  const { status, ...rest } = body as {
    status?: string | null;
    trackNumber?: number;
    fonograma?: string;
    artistPrincipal?: string | null;
    colaboradores?: string | null;
    productor?: string | null;
    autoresCompositores?: string | null;
    isrc?: string | null;
    comentario?: string | null;
    audioWavFileId?: number | null;
    audioPreviewFileId?: number | null;
    portadaFileId?: number | null;
  };

  if (status !== undefined && Object.keys(rest).length === 0) {
    const song = await setSongStatus(id, status, user.email);
    if (!song) return NextResponse.json({ error: "Canción no encontrada." }, { status: 404 });
    return NextResponse.json({ song });
  }

  const song = await updateSong(id, status !== undefined ? { ...rest, status } : rest, user.email);
  if (!song) return NextResponse.json({ error: "Canción no encontrada." }, { status: 404 });
  return NextResponse.json({ song });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; songId: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { songId } = await params;
  await deleteSong(Number(songId), user.email);
  return NextResponse.json({ ok: true });
}
