import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getTrack, ensureCatalogTrackForRelease } from "@/lib/db/catalog";
import { createSplit } from "@/lib/db/editorialSplits";
import { getReleaseById } from "@/lib/db/releases";
import type { SplitPersonInput } from "@discografica/shared/types/editorialSplits";

function isValidPersonInput(p: unknown): p is SplitPersonInput {
  if (!p || typeof p !== "object") return false;
  const percentX100 = (p as Record<string, unknown>).percentX100;
  if (typeof percentX100 !== "number" || !Number.isFinite(percentX100) || percentX100 <= 0) return false;
  if ("personId" in p) return typeof (p as { personId: unknown }).personId === "string";
  if ("newPerson" in p) {
    const np = (p as { newPerson: unknown }).newPerson;
    return !!np && typeof (np as { nombreArtistico?: unknown }).nombreArtistico === "string" && (np as { nombreArtistico: string }).nombreArtistico.trim().length > 0;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "crear_split_editorial")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { catalogTrackId, trackName, artistDisplay, sello, letra, musica, letraUrl, letraNombre } = body as {
    catalogTrackId?: string | null;
    trackName?: string;
    artistDisplay?: string;
    sello?: string | null;
    letra?: unknown[];
    musica?: unknown[];
    letraUrl?: string | null;
    letraNombre?: string | null;
  };

  // Sin catalogTrackId: el PM está cargando el split antes de que el
  // fonograma exista en el catálogo — track/artista/sello se toman del
  // body (tipeados a mano) en vez de resolverse contra catalog_tracks, y
  // el split queda "suelto" (catalog_track_id NULL, mismo criterio que un
  // Release cargado sin pm_release_id).
  let track: Awaited<ReturnType<typeof getTrack>> = null;
  if (catalogTrackId) {
    track = await getTrack(catalogTrackId);
    if (!track) {
      // Fonogramas cargados antes de que cada alta espejara automáticamente
      // en catalog_tracks se quedaron sin esa fila — en vez de bloquear el
      // split para siempre, si el id es el de un fonograma real de PM
      // ("pm-<id>") se genera la fila que falta ahí mismo y se sigue.
      const pmMatch = /^pm-(\d+)$/.exec(catalogTrackId);
      if (pmMatch) track = await ensureCatalogTrackForRelease(Number(pmMatch[1]));
    }
    if (!track) {
      return NextResponse.json({ error: "No encontramos esa canción." }, { status: 400 });
    }
  } else if (!trackName?.trim() || !artistDisplay?.trim()) {
    return NextResponse.json({ error: "Completá el nombre del fonograma y el artista." }, { status: 400 });
  }
  if (!Array.isArray(letra) || !letra.every(isValidPersonInput) || letra.length === 0) {
    return NextResponse.json({ error: "Revisá las personas y porcentajes de letra." }, { status: 400 });
  }
  if (!Array.isArray(musica) || !musica.every(isValidPersonInput) || musica.length === 0) {
    return NextResponse.json({ error: "Revisá las personas y porcentajes de música." }, { status: 400 });
  }

  // El audio nunca lo manda el cliente: si esta canción viene de un
  // fonograma de PM (catalog_tracks.id = "pm-<id>"), ya se subió cuando se
  // cargó el fonograma — se toma directo de pm_releases.audio_url en vez de
  // confiar en lo que mande el formulario. Sin track (split cargado antes
  // del fonograma) no hay nada de dónde tomarlo todavía.
  let audioUrl: string | null = null;
  const pmMatch = track ? /^pm-(\d+)$/.exec(track.id) : null;
  if (pmMatch) {
    const release = await getReleaseById(Number(pmMatch[1]));
    audioUrl = (release?.audio_url as string | null | undefined) ?? null;
  }

  try {
    const split = await createSplit({
      catalogTrackId: track?.id ?? null,
      trackName: track?.track ?? trackName!.trim(),
      artistDisplay: track?.artist_display ?? artistDisplay!.trim(),
      sello: track?.sello ?? (sello?.trim() || null),
      letra: letra as SplitPersonInput[],
      musica: musica as SplitPersonInput[],
      letraUrl: letraUrl?.trim() || null,
      letraNombre: letraNombre?.trim() || null,
      audioUrl,
      actorEmail: user.email,
    });
    return NextResponse.json({ split });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo enviar el split." }, { status: 400 });
  }
}
