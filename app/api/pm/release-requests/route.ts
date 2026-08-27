import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getReleaseById } from "@/lib/db/releases";
import { createReleaseRequest, type ReleaseParticipant } from "@/lib/db/legalReleaseRequests";
import { RELEASE_PARTICIPANT_TIPOS } from "@discografica/shared/types/legalReleaseRequests";

function isValidParticipant(p: unknown): p is ReleaseParticipant {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (typeof o.nombre !== "string" || !o.nombre.trim()) return false;
  if (typeof o.percentX100 !== "number" || !Number.isFinite(o.percentX100) || o.percentX100 <= 0) return false;
  if (!(RELEASE_PARTICIPANT_TIPOS as readonly string[]).includes(o.tipo as string)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "crear_release_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { pmReleaseId, trackName, artistDisplay, sello, fechaLanzamiento, participants } = body as {
    pmReleaseId?: number; trackName?: string; artistDisplay?: string; sello?: string | null;
    fechaLanzamiento?: string | null; participants?: unknown[];
  };

  if (!pmReleaseId || !trackName?.trim() || !artistDisplay?.trim()) {
    return NextResponse.json({ error: "Faltan datos del fonograma." }, { status: 400 });
  }
  const release = await getReleaseById(Number(pmReleaseId));
  if (!release) {
    return NextResponse.json({ error: "No encontramos ese fonograma." }, { status: 404 });
  }
  if (user.role !== "admin" && release.created_by !== user.email) {
    return NextResponse.json({ error: "No tenés acceso a este fonograma." }, { status: 403 });
  }
  if (!Array.isArray(participants) || !participants.every(isValidParticipant) || participants.length === 0) {
    return NextResponse.json({ error: "Revisá los participantes y sus porcentajes." }, { status: 400 });
  }

  try {
    const request = await createReleaseRequest({
      pmReleaseId: Number(pmReleaseId),
      trackName: trackName.trim(),
      artistDisplay: artistDisplay.trim(),
      sello: sello || null,
      fechaLanzamiento: fechaLanzamiento || null,
      participants: participants as ReleaseParticipant[],
      actorEmail: user.email,
    });
    return NextResponse.json({ request });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo guardar el Release." }, { status: 400 });
  }
}
