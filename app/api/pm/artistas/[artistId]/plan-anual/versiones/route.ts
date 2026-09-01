import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canViewAnnualPlan } from "@/lib/db/pmArtistAssignments";
import { listVersions } from "@/lib/db/pmAnnualPlan";

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canViewAnnualPlan(user, artistId))) {
    return NextResponse.json({ error: "No tenés acceso a este artista." }, { status: 403 });
  }
  const versions = await listVersions(artistId);
  return NextResponse.json({ versions });
}
