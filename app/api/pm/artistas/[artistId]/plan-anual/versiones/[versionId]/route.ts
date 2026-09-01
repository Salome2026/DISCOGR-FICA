import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canViewAnnualPlan } from "@/lib/db/pmArtistAssignments";
import { getVersion } from "@/lib/db/pmAnnualPlan";

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string; versionId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId, versionId } = await params;
  if (!(await canViewAnnualPlan(user, artistId))) {
    return NextResponse.json({ error: "No tenés acceso a este artista." }, { status: 403 });
  }
  const version = await getVersion(Number(versionId), artistId);
  if (!version) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ version });
}
