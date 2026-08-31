import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listAllMeetingRequests } from "@/lib/db/pmArtistWorkspace";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const requests = await listAllMeetingRequests();
  return NextResponse.json({ requests });
}
