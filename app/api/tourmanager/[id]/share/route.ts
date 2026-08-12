import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { setShareToken, getHoja } from "@/lib/db/tourManager";
import { recordAudit } from "@/lib/db/users";

// Generates (or rotates) the share link's token. Anyone with the resulting
// link can view — no login — which is exactly what the artist/crew need,
// but only a tourmanager-permitted user can ever mint or rotate that link.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const hoja = await getHoja(id);
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  const token = await setShareToken(id);
  await recordAudit({ actorEmail: user.email, action: "hoja_compartida", entityType: "tourmanager_hoja", entityId: id });
  return NextResponse.json({ token });
}
