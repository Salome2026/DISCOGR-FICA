import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getAssignment, updateAssignmentStatus } from "@/lib/db/arOpportunities";
import type { ArTaskStatus } from "@discografica/shared/types/ar";

const TASK_STATUSES: ArTaskStatus[] = ["pending", "acknowledged", "done"];

// The assigned PM can move their own task forward (acknowledge/complete
// it); admin/ar can too, for oversight. Nobody else — this isn't gated by
// canSeeOpportunity() alone because a *different* PM must never touch
// another PM's assignment even if they could otherwise see the opportunity.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { assignmentId } = await params;
  const numericId = Number(assignmentId);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }
  const assignment = await getAssignment(numericId);
  if (!assignment) {
    return NextResponse.json({ error: "Asignación no encontrada." }, { status: 404 });
  }
  const isOwner = assignment.pmEmail === user.email;
  const isOverseer = user.roles.includes("admin") || user.roles.includes("ar");
  if (!isOwner && !isOverseer) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json()) as { taskStatus?: ArTaskStatus };
  if (!body.taskStatus || !TASK_STATUSES.includes(body.taskStatus)) {
    return NextResponse.json({ error: "Estado de tarea inválido." }, { status: 400 });
  }
  const updated = await updateAssignmentStatus(numericId, body.taskStatus);
  return NextResponse.json({ assignment: updated });
}
