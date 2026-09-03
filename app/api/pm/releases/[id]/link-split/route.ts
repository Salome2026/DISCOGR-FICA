import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReleaseById } from "@/lib/db/releases";
import { ensureCatalogTrackForRelease } from "@/lib/db/catalog";
import { linkSplitToCatalogTrack } from "@/lib/db/editorialSplits";

// Vincula un Split editorial cargado a mano (sin fonograma todavía) al
// fonograma real recién creado — genera la fila de catalog_tracks si hace
// falta (mismo criterio que el POST normal de split-editorial) y toma el
// audio del fonograma para el split, ya que no había nada de dónde
// tomarlo cuando se cargó a mano.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const email = session?.user?.email;
  if (!email || roles.length === 0) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const release = await getReleaseById(Number(id));
  if (!release) {
    return NextResponse.json({ error: "Lanzamiento no encontrado." }, { status: 404 });
  }
  if (!roles.includes("admin") && release.created_by !== email) {
    return NextResponse.json({ error: "No tenés acceso a este lanzamiento." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.splitId !== "string" || !body.splitId) {
    return NextResponse.json({ error: "Falta splitId." }, { status: 400 });
  }
  const track = await ensureCatalogTrackForRelease(Number(id));
  if (!track) {
    return NextResponse.json({ error: "No se pudo preparar el fonograma en el catálogo." }, { status: 400 });
  }
  const linked = await linkSplitToCatalogTrack(body.splitId, track.id, (release.audio_url as string | null) ?? null, email);
  if (!linked) {
    return NextResponse.json({ error: "Ese split ya no está disponible para vincular." }, { status: 409 });
  }
  return NextResponse.json({ split: linked });
}
