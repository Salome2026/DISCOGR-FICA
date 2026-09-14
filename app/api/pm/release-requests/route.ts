import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getReleaseById } from "@/lib/db/releases";
import { getTrack, ensureCatalogTrackForRelease } from "@/lib/db/catalog";
import { createReleaseRequest, type ReleaseParticipant } from "@/lib/db/legalReleaseRequests";
import { RELEASE_TIPOS } from "@discografica/shared/types/legalReleaseRequests";

function isValidParticipant(p: unknown): p is ReleaseParticipant {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (typeof o.nombre !== "string" || !o.nombre.trim()) return false;
  if (typeof o.percentX100 !== "number" || !Number.isFinite(o.percentX100) || o.percentX100 <= 0) return false;
  return true;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "crear_release_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { pmReleaseId, catalogTrackId, trackName, artistDisplay, sello, fechaLanzamiento, tipo, participants, comentario } = body as {
    pmReleaseId?: number | null; catalogTrackId?: string | null; trackName?: string; artistDisplay?: string; sello?: string | null;
    fechaLanzamiento?: string | null; tipo?: string; participants?: unknown[]; comentario?: string | null;
  };

  if (!tipo || !(RELEASE_TIPOS as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: "Elegí de qué parte es este Release." }, { status: 400 });
  }

  // catalogTrackId: la canción se buscó/eligió en el catálogo (flujo suelto
  // con EP/Álbum/Fonograma, mismo mecanismo que Split editorial) — track/
  // artista/sello se resuelven server-side desde catalog_tracks en vez de
  // confiar en lo que mande el cliente para esos campos. Si además es un
  // fonograma real de PM ("pm-<id>"), se aplica el mismo chequeo de
  // ownership que ya existía para pmReleaseId.
  let resolvedPmReleaseId: number | null = pmReleaseId != null ? Number(pmReleaseId) : null;
  let resolvedTrackName = trackName?.trim() || "";
  let resolvedArtistDisplay = artistDisplay?.trim() || "";
  let resolvedSello = sello || null;

  if (catalogTrackId) {
    let track = await getTrack(catalogTrackId);
    if (!track) {
      const pmMatch = /^pm-(\d+)$/.exec(catalogTrackId);
      if (pmMatch) track = await ensureCatalogTrackForRelease(Number(pmMatch[1]));
    }
    if (!track) {
      return NextResponse.json({ error: "No encontramos esa canción." }, { status: 400 });
    }
    resolvedTrackName = track.track;
    resolvedArtistDisplay = track.artist_display;
    resolvedSello = track.sello;
    const pmMatch = /^pm-(\d+)$/.exec(track.id);
    resolvedPmReleaseId = pmMatch ? Number(pmMatch[1]) : null;
  }

  if (!resolvedTrackName || !resolvedArtistDisplay) {
    return NextResponse.json({ error: "Faltan datos del fonograma." }, { status: 400 });
  }
  // pmReleaseId es opcional — un PM puede cargar el Release antes de que el
  // fonograma exista todavía. Cuando sí viene (ya sea directo o resuelto vía
  // catalogTrackId), se valida que el fonograma sea real y del PM (el
  // chequeo de ownership no aplica a uno "suelto", no hay fonograma del que
  // ser dueño).
  if (resolvedPmReleaseId != null) {
    const release = await getReleaseById(resolvedPmReleaseId);
    if (!release) {
      return NextResponse.json({ error: "No encontramos ese fonograma." }, { status: 404 });
    }
    if (!user.roles.includes("admin") && release.created_by !== user.email) {
      return NextResponse.json({ error: "No tenés acceso a este fonograma." }, { status: 403 });
    }
  }
  if (!Array.isArray(participants) || !participants.every(isValidParticipant) || participants.length === 0) {
    return NextResponse.json({ error: "Revisá los participantes y sus porcentajes." }, { status: 400 });
  }

  try {
    const request = await createReleaseRequest({
      pmReleaseId: resolvedPmReleaseId,
      trackName: resolvedTrackName,
      artistDisplay: resolvedArtistDisplay,
      sello: resolvedSello,
      fechaLanzamiento: fechaLanzamiento || null,
      tipo: tipo as (typeof RELEASE_TIPOS)[number],
      participants: participants as ReleaseParticipant[],
      comentario: comentario?.trim() || null,
      actorEmail: user.email,
    });
    return NextResponse.json({ request });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo guardar el Release." }, { status: 400 });
  }
}
