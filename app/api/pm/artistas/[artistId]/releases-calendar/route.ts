import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";
import { listReleasesForArtist } from "@/lib/db/releases";

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const artist = await getArtist(artistId);
  if (!artist) return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });

  const releases = await listReleasesForArtist(artist.name);
  return NextResponse.json({ releases });
}
