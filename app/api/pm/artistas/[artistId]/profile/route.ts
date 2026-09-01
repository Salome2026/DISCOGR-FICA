import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { upsertArtistProfile } from "@/lib/db/pmArtistWorkspace";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const body = await req.json();
  const { planAnual, objetivosGenerales } = body as { planAnual?: string | null; objetivosGenerales?: string | null };
  const profile = await upsertArtistProfile(artistId, { planAnual, objetivosGenerales }, user.email);
  return NextResponse.json({ profile });
}
