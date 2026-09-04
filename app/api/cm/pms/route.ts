import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listAllAssignments, listCollaboratorsForArtist } from "@/lib/db/pmArtistAssignments";
import { listUsersByRole } from "@/lib/db/users";
import { listLaunchesForArtist } from "@/lib/db/cmLaunches";

// Visibilidad deliberadamente amplia (todo el sello, no solo las cuentas
// propias de esta CM) — mismo criterio ya documentado en
// app/api/cm/releases/route.ts: la CM necesita saber a quién reclamarle
// materiales de cualquier lanzamiento, no solo de los suyos. Por eso el gate
// es por rol explícito, no por hasPermission("ver_cm") solo (que también lo
// tiene project_manager vía ver_ar... no, project_manager no tiene ver_cm —
// pero igual se gatea por rol explícito para no depender de qué permisos
// termine teniendo cada rol más adelante).
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const roles = user?.roles ?? [];
  if (!user?.email || !(roles.includes("community_manager") || roles.includes("management") || roles.includes("admin"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [assignments, pmUsers] = await Promise.all([listAllAssignments(), listUsersByRole("project_manager")]);
  const pmNameByEmail = new Map(pmUsers.map((u) => [u.email, u.name]));

  // Junta colaboradores por artista (proyectos compartidos) — una consulta
  // por artista es aceptable acá: el roster real tiene decenas de artistas,
  // no miles, y esta ruta no se llama en un loop caliente.
  const withCollaborators = await Promise.all(
    assignments.map(async (a) => ({
      ...a,
      collaborators: await listCollaboratorsForArtist(a.artistId),
      launch: (await listLaunchesForArtist(a.artistId))[0] ?? null,
    }))
  );

  const byPm = new Map<string, { email: string; name: string; artists: Array<{
    artistId: string; artistName: string; photoUrl: string | null; role: "owner" | "collaborator";
    materialesEstado: string | null; fechaLanzamiento: string | null;
    launchId: string | null; responsiblePms: string[];
  }> }>();

  function ensurePm(email: string) {
    if (!byPm.has(email)) {
      byPm.set(email, { email, name: pmNameByEmail.get(email) ?? email, artists: [] });
    }
    return byPm.get(email)!;
  }

  for (const a of withCollaborators) {
    // Todos los responsables de este artista (dueño + colaboradores) — se
    // repite igual en la tarjeta del dueño y en la de cada colaborador,
    // para que el selector de "Solicitar material" siempre pueda ofrecer
    // "a uno o a todos" sin importar desde qué tarjeta se abre.
    const responsiblePms = [a.pmEmail, ...a.collaborators];
    ensurePm(a.pmEmail).artists.push({
      artistId: a.artistId, artistName: a.artistName, photoUrl: a.photoUrl, role: "owner",
      materialesEstado: a.launch?.materialesEstado ?? null, fechaLanzamiento: a.launch?.fechaLanzamiento ?? null,
      launchId: a.launch?.id ?? null, responsiblePms,
    });
    for (const collabEmail of a.collaborators) {
      ensurePm(collabEmail).artists.push({
        artistId: a.artistId, artistName: a.artistName, photoUrl: a.photoUrl, role: "collaborator",
        materialesEstado: a.launch?.materialesEstado ?? null, fechaLanzamiento: a.launch?.fechaLanzamiento ?? null,
        launchId: a.launch?.id ?? null, responsiblePms,
      });
    }
  }

  const pms = [...byPm.values()].sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ pms });
}
