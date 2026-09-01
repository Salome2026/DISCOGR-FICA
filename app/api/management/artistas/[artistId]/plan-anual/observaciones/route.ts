import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { updatePlanManagementNotes } from "@/lib/db/pmAnnualPlan";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const body = await req.json();
  const { observacionesManagement } = body as { observacionesManagement: string | null };

  const plan = await updatePlanManagementNotes(artistId, observacionesManagement, user.email);
  if (!plan) return NextResponse.json({ error: "El plan todavía no existe para este artista." }, { status: 404 });
  return NextResponse.json({ plan });
}
