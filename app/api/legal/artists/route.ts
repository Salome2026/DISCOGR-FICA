import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listAllArtists } from "@/lib/db/artists";

// Read-only artist directory for the Legal module — same underlying data
// as /api/artists (admin-only) but on its own gate, same pattern as
// /api/legal/releases.
export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const artists = await listAllArtists();
  return NextResponse.json({ artists });
}
