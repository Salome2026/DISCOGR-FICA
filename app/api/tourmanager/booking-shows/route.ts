import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listShows } from "@/lib/db/booking";

// A bridge route of Tour Manager's own, gated by ver_tourmanager — not
// Booking's ver_booking — so a tourmanager-only user (no Booking access) can
// still reuse a show already loaded there to skip re-typing artist/fecha/
// venue/ciudad/coords. Same "aislamiento de rol, reuso de datos" pattern
// already used for the artist typeahead (/api/artists/search).
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const shows = await listShows();
  return NextResponse.json({ shows });
}
