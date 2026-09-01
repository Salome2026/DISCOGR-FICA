import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listAllArtists } from "@/lib/db/artists";

// Temporary: while PM↔artist assignments aren't fully populated for every
// active PM yet, the studio-booking picker shows the full roster to any
// authenticated PM/management/admin, not just a PM's own assigned artists.
// This is scoped to studio bookings only — /api/pm/artistas (Mis Artistas,
// the release-creation restriction) is untouched.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.roles?.length || !user.roles.some((r) => ["project_manager", "management", "admin"].includes(r))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const artists = await listAllArtists();
  return NextResponse.json({ artists: artists.map((a) => ({ id: a.id, name: a.name, photoUrl: a.photoUrl })) });
}
