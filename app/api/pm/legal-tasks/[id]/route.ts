import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPendingTask, respondToTask } from "@/lib/db/legalPendingTasks";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getPendingTask(id);
  if (!existing) {
    return NextResponse.json({ error: "No encontramos ese pendiente." }, { status: 404 });
  }
  if (!user.roles.includes("admin") && !existing.targetPms.includes(user.email)) {
    return NextResponse.json({ error: "No tenés acceso a este pendiente." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.response !== "string" || !body.response.trim()) {
    return NextResponse.json({ error: "Falta la respuesta." }, { status: 400 });
  }
  const updated = await respondToTask(id, body.response.trim(), user.email);
  if (!updated) {
    return NextResponse.json({ error: "Ese pendiente ya fue resuelto." }, { status: 409 });
  }
  return NextResponse.json({ task: updated });
}
