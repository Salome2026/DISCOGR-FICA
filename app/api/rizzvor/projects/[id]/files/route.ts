import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { addFile, listFiles, setArtistPhoto, RIZZVOR_FILE_KINDS } from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const files = await listFiles(id);
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { songId, kind, url, fileName, contentType, sizeBytes, width, height, setAsArtistPhoto } = body as {
    songId?: number | null;
    kind?: string;
    url?: string;
    fileName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
    width?: number | null;
    height?: number | null;
    setAsArtistPhoto?: boolean;
  };

  if (!url) {
    return NextResponse.json({ error: "Falta la URL del archivo." }, { status: 400 });
  }
  if (!kind || !RIZZVOR_FILE_KINDS.includes(kind as (typeof RIZZVOR_FILE_KINDS)[number])) {
    return NextResponse.json({ error: "Tipo de archivo inválido." }, { status: 400 });
  }

  const file = await addFile(
    id,
    {
      songId: songId ?? null,
      kind,
      url,
      fileName: fileName || null,
      contentType: contentType || null,
      sizeBytes: sizeBytes ?? null,
      width: width ?? null,
      height: height ?? null,
    },
    user.email
  );

  if (setAsArtistPhoto || kind === "foto_artista") {
    await setArtistPhoto(id, file.id, user.email);
  }

  return NextResponse.json({ file });
}
