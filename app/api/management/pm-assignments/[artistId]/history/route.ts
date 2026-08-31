import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getAssignmentHistory } from "@/lib/db/pmArtistAssignments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "administrar_asignaciones_pm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const history = await getAssignmentHistory(artistId);
  return NextResponse.json({ history });
}
