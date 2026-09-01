import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { updateQuarterlyReviewManagementNotes } from "@/lib/db/pmAnnualPlan";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string; quarter: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId, quarter } = await params;
  const body = await req.json();
  const { observacionesManagement } = body as { observacionesManagement: string | null };

  const review = await updateQuarterlyReviewManagementNotes(artistId, quarter, observacionesManagement, user.email);
  return NextResponse.json({ review });
}
