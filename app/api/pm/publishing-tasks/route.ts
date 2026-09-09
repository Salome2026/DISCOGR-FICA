import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listTasksForPm } from "@/lib/db/publishingPendingTasks";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status");
  const tasks = await listTasksForPm(user.email, status === "Pendiente" || status === "Resuelto" ? { status } : undefined);
  return NextResponse.json({ tasks });
}
