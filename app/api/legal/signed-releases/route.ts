import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listSignedReleases, createSignedRelease } from "@/lib/db/legalSignedReleases";

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
  const releases = await listSignedReleases();
  return NextResponse.json({ releases });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { artist, sello, fonograma, featuring, fechaFirma, documentoUrl, documentoNombre, notas } =
    body as Record<string, string | null | undefined>;

  if (!artist || !artist.trim()) {
    return NextResponse.json({ error: "El artista es obligatorio." }, { status: 400 });
  }
  if (!fonograma || !fonograma.trim()) {
    return NextResponse.json({ error: "El nombre de la canción es obligatorio." }, { status: 400 });
  }

  const release = await createSignedRelease({
    artist: artist.trim(),
    sello: sello || null,
    fonograma: fonograma.trim(),
    featuring: featuring || null,
    fechaFirma: fechaFirma || null,
    documentoUrl: documentoUrl || null,
    documentoNombre: documentoNombre || null,
    notas: notas || null,
    actorEmail: user.email,
  });

  return NextResponse.json({ release });
}
