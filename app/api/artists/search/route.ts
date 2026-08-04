import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchArtists } from "@/lib/db/artists";

// Typeahead used by the AI marketing-plan form so nobody has to leave the
// platform to go find an artist's Instagram/TikTok/YouTube link.
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.email || role === "sin_acceso" || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });

  const results = await searchArtists(q, 8);
  return NextResponse.json({ results });
}
