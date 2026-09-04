import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import {
  createMaterialRequest, listRequestsForArtist, emptyMaterialNeeds,
  CM_REQUEST_TIPOS, type MaterialNeeds, type CmRequestTipo,
} from "@/lib/db/cmMaterialRequests";
import { MATERIAL_NEEDS_FIELDS } from "@/lib/cmMaterialRequestConstants";
import { getAssignment, listCollaboratorsForArtist } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";

function canSeeArtist(roles: string[]): boolean {
  return roles.includes("community_manager") || roles.includes("management") || roles.includes("admin");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  const roles = user?.roles ?? [];
  if (!user?.email || !canSeeArtist(roles)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const requests = await listRequestsForArtist(artistId);
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  const body = await req.json().catch(() => null);
  const { launchId, targetPms, needs, infoAdicional, tipo, artistName: bodyArtistName } = (body ?? {}) as {
    launchId?: string | null; targetPms?: unknown; needs?: unknown; infoAdicional?: string | null;
    tipo?: string; artistName?: string;
  };

  if (!Array.isArray(targetPms) || targetPms.length === 0 || !targetPms.every((p) => typeof p === "string")) {
    return NextResponse.json({ error: "Elegí a qué PM dirigir el pedido." }, { status: 400 });
  }
  if (!tipo || !(CM_REQUEST_TIPOS as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: "Tipo de pedido inválido." }, { status: 400 });
  }

  // Cada PM apuntado tiene que ser efectivamente responsable de este
  // artista (dueño o colaborador) — mismo universo que ya arma
  // GET /api/cm/pms, chequeado acá contra la fuente real en vez de confiar
  // en lo que mande el cliente.
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

  const cleanNeeds: MaterialNeeds = { ...emptyMaterialNeeds() };
  if (needs && typeof needs === "object") {
    for (const f of MATERIAL_NEEDS_FIELDS) {
      const v = (needs as Record<string, unknown>)[f.key];
      if (typeof v === "boolean") cleanNeeds[f.key] = v;
    }
  }

  try {
    const request = await createMaterialRequest({
      launchId: launchId || null,
      artistId,
      artistName,
      targetPms: [...new Set(targetPms)],
      needs: cleanNeeds,
      infoAdicional: infoAdicional?.trim() || null,
      tipo: tipo as CmRequestTipo,
      actorEmail: user.email,
    });
    return NextResponse.json({ request });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo crear el pedido." }, { status: 400 });
  }
}
