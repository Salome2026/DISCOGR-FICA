import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { searchTracks } from "@/lib/db/catalog";

// Lets a PM find a song already loaded in the catalog without ever seeing
// the Publishing module itself — this route is scoped to crear_split_editorial,
// not ver_publishing/ver_management/etc.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "crear_split_editorial")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const tracks = await searchTracks(q);
  return NextResponse.json({
    tracks: tracks.map((t) => ({ id: t.id, track: t.track, artistDisplay: t.artist_display, sello: t.sello })),
  });
}
