import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listAlerts } from "@/lib/db/arAlerts";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const includeAcknowledged = req.nextUrl.searchParams.get("all") === "1";
  const alerts = await listAlerts({ includeAcknowledged });
  return NextResponse.json({ alerts });
}
