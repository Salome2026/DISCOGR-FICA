import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getManagementReleaseEvents } from "@/lib/db/managementReleases";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const releases = await getManagementReleaseEvents();
  return NextResponse.json({ releases });
}
