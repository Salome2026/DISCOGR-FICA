import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getManagementArtistOverview } from "@/lib/db/managementArtists";

// Accepts either the web cookie session or a mobile Bearer token — the
// mobile Management module is read-only for now (viewer only, no photo
// upload/reorder/estado editing yet), so POST/PATCH stay cookie-only.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const artists = await getManagementArtistOverview();
  return NextResponse.json({ artists });
}
