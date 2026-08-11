import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listAllArtists } from "@/lib/db/artists";

// Read-only artist directory for the Legal module — same underlying data
// as /api/artists (admin-only) but on its own gate, same pattern as
// /api/legal/releases. Accepts either the web cookie session or a mobile
// Bearer token.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const artists = await listAllArtists();
  return NextResponse.json({ artists });
}
