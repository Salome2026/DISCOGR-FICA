import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listAssignmentsForPm, listAllAssignments } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || (!user.roles.includes("project_manager") && !user.roles.includes("admin"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const assignments = user.roles.includes("admin") ? await listAllAssignments() : await listAssignmentsForPm(user.email);
  const enriched = await Promise.all(
    assignments.map(async (a) => {
      const artist = await getArtist(a.artistId);
      return { ...a, photoUrl: a.photoUrl ?? artist?.photoUrl ?? null, sello: artist?.sello ?? null };
    })
  );
  return NextResponse.json({ artists: enriched });
}
