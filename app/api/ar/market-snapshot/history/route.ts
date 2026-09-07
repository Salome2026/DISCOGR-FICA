import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listMarketSnapshots } from "@/lib/db/arMarketSnapshots";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const snapshots = await listMarketSnapshots("combined", 10);
  return NextResponse.json({ snapshots });
}
