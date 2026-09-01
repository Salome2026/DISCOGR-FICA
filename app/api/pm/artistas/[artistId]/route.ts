import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist, getAssignment } from "@/lib/db/pmArtistAssignments";
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

  const [artist, assignment, profile, actionItems, notes] = await Promise.all([
    getArtist(artistId),
    getAssignment(artistId),
    getArtistProfile(artistId),
    listActionItems(artistId),
    listNotes(artistId),
  ]);
  if (!artist) return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });

  return NextResponse.json({ artist, assignment, profile, actionItems, notes });
}
