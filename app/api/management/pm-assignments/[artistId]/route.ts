import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { removeAssignment } from "@/lib/db/pmArtistAssignments";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "administrar_asignaciones_pm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: "Hay que indicar el motivo para revocar este artista." }, { status: 400 });
  }
  await removeAssignment(artistId, reason, user.email);
  return NextResponse.json({ ok: true });
}
