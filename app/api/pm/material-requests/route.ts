import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listRequestsForPm } from "@/lib/db/cmMaterialRequests";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status");
  const requests = await listRequestsForPm(user.email, status === "Pendiente" || status === "Resuelto" ? { status } : undefined);
  return NextResponse.json({ requests });
}
