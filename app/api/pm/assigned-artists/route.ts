import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAssignedArtists } from "@/lib/db/users";
import { listAssignmentsForPm } from "@/lib/db/pmArtistAssignments";

// Two unrelated "assigned artists" concepts share this one route by role:
// artista/representante (lib/db/users.ts's pm_artist_assignments, enforced
// by checkArtistAssignment in app/api/pm/releases/route.ts) and
// project_manager (lib/db/pmArtistAssignments.ts's pm_roster_assignments,
// the Management-administered assignment system). Neither consumer needs to
// change — both already call this same URL and expect { artists: string[] }.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (user.roles.includes("project_manager")) {
    const assignments = await listAssignmentsForPm(user.email);
    return NextResponse.json({ artists: assignments.map((a) => a.artistName) });
  }
  const artists = await getAssignedArtists(user.email);
  return NextResponse.json({ artists });
}
