import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist, getAssignment, setAssignmentPhoto } from "@/lib/db/pmArtistAssignments";
import { getArtistProfile, listActionItems, listNotes } from "@/lib/db/pmArtistWorkspace";
import { getArtist } from "@/lib/db/artists";

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const [realArtist, assignment, profile, actionItems, notes] = await Promise.all([
    getArtist(artistId),
    getAssignment(artistId),
    getArtistProfile(artistId),
    listActionItems(artistId),
    listNotes(artistId),
  ]);
  // Una "unidad" (streaming, sello) a propósito nunca tiene fila en
  // `artists` — construye una entrada mínima desde la propia asignación en
  // vez de devolver 404, así Federico (y cualquier otra unidad asignada)
  // puede abrir su ficha igual que un artista real.
  const artist = realArtist ?? (assignment ? {
    id: assignment.artistId, name: assignment.artistName, aliases: [], sello: null,
    instagram: null, tiktok: null, youtube: null, spotify: null, chartmetricId: null,
    photoUrl: assignment.photoUrl, chartPosition: null, estadoGeneral: null, genero: null,
    notas: null, updatedAt: null,
  } : null);
  if (!artist) return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });

  return NextResponse.json({ artist, assignment, profile, actionItems, notes });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId)) && !user.roles.includes("management")) {
    return NextResponse.json({ error: "No tenés acceso a esta ficha." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.photoUrl !== "string" && body?.photoUrl !== null) {
    return NextResponse.json({ error: "Falta photoUrl." }, { status: 400 });
  }
  await setAssignmentPhoto(artistId, body.photoUrl?.trim() || null, user.email);
  return NextResponse.json({ ok: true });
}
