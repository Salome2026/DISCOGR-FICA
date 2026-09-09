import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listAllAssignments, listCollaboratorsForArtist } from "@/lib/db/pmArtistAssignments";
import { listUsersByRole } from "@/lib/db/users";

// PM roster enriquecido con sus artistas — para la pantalla de "Pendientes
// de PM" (app/panel/management/pms/page.tsx). Deliberadamente en una ruta
// propia, NO en /api/management/pms (ese endpoint ya existe, es el picker
// angosto {email,name} que usan asignaciones/page.tsx y
// ManagementMeetingsCalendar.tsx — no se toca). Mismo esqueleto que
// app/api/legal/pms/route.ts y app/api/publishing/pms/route.ts.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "administrar_asignaciones_pm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [assignments, pmUsers] = await Promise.all([listAllAssignments(), listUsersByRole("project_manager")]);
  const pmNameByEmail = new Map(pmUsers.map((u) => [u.email, u.name]));

  const withCollaborators = await Promise.all(
    assignments.map(async (a) => ({ ...a, collaborators: await listCollaboratorsForArtist(a.artistId) }))
  );

  const byPm = new Map<string, { email: string; name: string; artists: Array<{
    artistId: string; artistName: string; photoUrl: string | null; role: "owner" | "collaborator"; responsiblePms: string[];
  }> }>();

  function ensurePm(email: string) {
    if (!byPm.has(email)) byPm.set(email, { email, name: pmNameByEmail.get(email) ?? email, artists: [] });
    return byPm.get(email)!;
  }

  for (const a of withCollaborators) {
    const responsiblePms = [a.pmEmail, ...a.collaborators];
    ensurePm(a.pmEmail).artists.push({ artistId: a.artistId, artistName: a.artistName, photoUrl: a.photoUrl, role: "owner", responsiblePms });
    for (const collabEmail of a.collaborators) {
      ensurePm(collabEmail).artists.push({ artistId: a.artistId, artistName: a.artistName, photoUrl: a.photoUrl, role: "collaborator", responsiblePms });
    }
  }

  const pms = [...byPm.values()].sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ pms });
}
