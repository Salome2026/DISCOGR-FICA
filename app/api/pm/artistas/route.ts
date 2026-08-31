import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listAssignmentsForPm, listAllAssignments } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || (user.role !== "project_manager" && user.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const assignments = user.role === "admin" ? await listAllAssignments() : await listAssignmentsForPm(user.email);
  const enriched = await Promise.all(
    assignments.map(async (a) => {
      const artist = await getArtist(a.artistId);
      return { ...a, photoUrl: artist?.photoUrl ?? null, sello: artist?.sello ?? null };
    })
  );
  return NextResponse.json({ artists: enriched });
}
