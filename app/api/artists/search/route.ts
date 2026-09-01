import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { searchArtists } from "@/lib/db/artists";

// Typeahead used by the AI marketing-plan form (and Tour Manager, web + mobile)
// so nobody has to leave the platform to go find an artist.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });

  const results = await searchArtists(q, 8);
  return NextResponse.json({ results });
}
