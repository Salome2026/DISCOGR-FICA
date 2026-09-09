import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { createPendingTask, listTasksForArtist } from "@/lib/db/legalPendingTasks";
import { getAssignment, listCollaboratorsForArtist } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";

function canSeeArtist(roles: string[]): boolean {
  return roles.includes("legal") || roles.includes("management") || roles.includes("admin");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  const roles = user?.roles ?? [];
  if (!user?.email || !canSeeArtist(roles)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const tasks = await listTasksForArtist(artistId);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const body = await req.json().catch(() => null);
  const { targetPms, titulo, descripcion, artistName: bodyArtistName } = (body ?? {}) as {
    targetPms?: unknown; titulo?: string; descripcion?: string | null; artistName?: string;
  };

  if (!Array.isArray(targetPms) || targetPms.length === 0 || !targetPms.every((p) => typeof p === "string")) {
    return NextResponse.json({ error: "Elegí a qué PM dirigir el pendiente." }, { status: 400 });
  }
  if (!titulo?.trim()) {
    return NextResponse.json({ error: "Falta el título del pendiente." }, { status: 400 });
  }

  // Cada PM apuntado tiene que ser efectivamente responsable de este
  // artista (dueño o colaborador) — mismo chequeo que
  // app/api/cm/pms/[artistId]/requests/route.ts.
  const [assignment, collaborators] = await Promise.all([getAssignment(artistId), listCollaboratorsForArtist(artistId)]);
  const validPms = new Set<string>([...(assignment ? [assignment.pmEmail] : []), ...collaborators]);
  const invalid = targetPms.filter((p) => !validPms.has(p));
  if (invalid.length > 0 || validPms.size === 0) {
    return NextResponse.json({ error: "Ese artista no tiene ningún PM responsable válido para esos destinatarios." }, { status: 400 });
  }

  const artist = await getArtist(artistId);
  const artistName = artist?.name ?? bodyArtistName;
  if (!artistName) {
    return NextResponse.json({ error: "No encontramos el nombre del artista." }, { status: 400 });
  }

  try {
    const task = await createPendingTask({
      artistId,
      artistName,
      targetPms: [...new Set(targetPms)],
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      actorEmail: user.email,
    });
    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo crear el pendiente." }, { status: 400 });
  }
}
