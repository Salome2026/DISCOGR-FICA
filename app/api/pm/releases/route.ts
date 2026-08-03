import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { auth } from "@/auth";
import {
  createRelease,
  createGroupedRelease,
  findDuplicateRelease,
  listReleasesFor,
  type EstadoRelease,
} from "@/lib/db/releases";
import { getAssignedArtists } from "@/lib/db/users";
import { upsertTrackFromRelease } from "@/lib/db/catalog";
import { isActiveStreamingProjectName } from "@/lib/db/streamingProjects";
import { notifyNewLanzamiento } from "@/lib/email";

const ESTADOS: EstadoRelease[] = ["Contactado", "Firmado", "Necesito ayuda"];
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeHora(hora: unknown): string {
  return typeof hora === "string" && HORA_RE.test(hora) ? hora : "00:00";
}

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;
  if (!email || role === "sin_acceso" || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const releases = await listReleasesFor(email, role);
  return NextResponse.json({ releases });
}

async function checkArtistAssignment(role: string, email: string, artist: string) {
  // Artist assignment for project_manager isn't set up yet — don't block
  // release creation on it. artista/representante still enforce it.
  if (role !== "artista" && role !== "representante") return true;
  const assigned = await getAssignedArtists(email);
  return assigned.map((a) => a.toLowerCase()).includes(String(artist).toLowerCase());
}

function canonicalCompany(distribuidora: string | null | undefined): string | null {
  if (!distribuidora || distribuidora === "Sin definir") return null;
  return distribuidora;
}

function buildParticipants(mainArtist: string, colaboradores: string | null): string[] {
  const names = [mainArtist];
  if (colaboradores) {
    for (const c of colaboradores.split(",")) {
      const n = c.trim();
      if (n) names.push(n);
    }
  }
  return names;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;
  if (!email || role === "sin_acceso" || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const tipo = body.tipo === "ep" || body.tipo === "album" ? body.tipo : "single";

  const sello: string | undefined = body.sello || undefined;
  let streamingProject: string | null = body.streamingProject || null;
  if (sello === "Streamings") {
    if (!streamingProject) {
      return NextResponse.json({ error: "Elegí el proyecto de streaming." }, { status: 400 });
    }
    if (!(await isActiveStreamingProjectName(streamingProject))) {
      return NextResponse.json({ error: "Proyecto de streaming inválido." }, { status: 400 });
    }
  } else {
    streamingProject = null;
  }

  if (tipo === "ep" || tipo === "album") {
    return handleGroupedCreate(body, tipo, role, email, sello ?? null, streamingProject);
  }
  return handleSingleCreate(body, role, email, sello ?? null, streamingProject);
}

async function handleSingleCreate(
  body: Record<string, unknown>,
  role: string,
  email: string,
  sello: string | null,
  streamingProject: string | null
) {
  const { artist, fonograma, estado, distribuidora, fecha, hora, autoresCompositores, audioUrl, portadaUrl } = body as {
    artist?: string; fonograma?: string; estado?: string; distribuidora?: string;
    fecha?: string; hora?: string; autoresCompositores?: string; audioUrl?: string; portadaUrl?: string;
  };
  const horaNorm = normalizeHora(hora);

  if (!artist || !fonograma || !estado) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios: artista, fonograma y estado." },
      { status: 400 }
    );
  }
  if (!ESTADOS.includes(estado as EstadoRelease)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  if (fecha && Number.isNaN(Date.parse(fecha))) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!(await checkArtistAssignment(role, email, artist))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const dup = await findDuplicateRelease(artist, fonograma, fecha || null);
  if (dup) {
    return NextResponse.json(
      { error: "Ya existe un lanzamiento con ese artista, fonograma y fecha." },
      { status: 409 }
    );
  }

  const release = await createRelease({
    artist,
    sello,
    streamingProject,
    fonograma,
    estado: estado as EstadoRelease,
    distribuidora: distribuidora || null,
    fecha: fecha || null,
    hora: horaNorm,
    autoresCompositores: autoresCompositores || null,
    audioUrl: audioUrl || null,
    portadaUrl: portadaUrl || null,
    createdBy: email,
  });

  await upsertTrackFromRelease({
    id: `pm-${release.id}`,
    track: fonograma,
    album: null,
    releaseDate: fecha || null,
    company: canonicalCompany(distribuidora),
    artistDisplay: artist,
    participants: [artist],
    sello,
    streamingProject,
  });

  // Fire-and-forget after the response is sent would get killed mid-flight
  // once the serverless invocation freezes — waitUntil keeps this function
  // alive in the background until the email actually finishes sending.
  waitUntil(
    notifyNewLanzamiento({
      tipo: "single",
      artist,
      sello,
      streamingProject,
      fonograma,
      estado: estado as EstadoRelease,
      distribuidora: distribuidora || null,
      fecha: fecha || null,
      hora: horaNorm,
      autoresCompositores: autoresCompositores || null,
      audioUrl: audioUrl || null,
      portadaUrl: portadaUrl || null,
      createdBy: email,
    }).catch((err) => console.error("notifyNewLanzamiento failed:", err))
  );

  return NextResponse.json({ release }, { status: 201 });
}

type TrackInput = {
  trackNumber?: number;
  fonograma?: string;
  artist?: string;
  colaboradores?: string;
  productor?: string;
  isrc?: string;
  audioUrl?: string;
  portadaUrl?: string;
  comentario?: string;
};

async function handleGroupedCreate(
  body: Record<string, unknown>,
  tipo: "ep" | "album",
  role: string,
  email: string,
  sello: string | null,
  streamingProject: string | null
) {
  const { artist, nombre, estado, distribuidora, fecha, hora, comentarios, tracks } = body as {
    artist?: string; nombre?: string; estado?: string; distribuidora?: string;
    fecha?: string; hora?: string; comentarios?: string; tracks?: TrackInput[];
  };
  const horaNorm = normalizeHora(hora);

  if (!artist || !nombre || !estado) {
    return NextResponse.json(
      { error: `Faltan campos obligatorios: artista, nombre del ${tipo === "ep" ? "EP" : "álbum"} y estado.` },
      { status: 400 }
    );
  }
  if (!ESTADOS.includes(estado as EstadoRelease)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  if (fecha && Number.isNaN(Date.parse(fecha))) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return NextResponse.json(
      { error: "Agregá al menos una canción antes de guardar." },
      { status: 400 }
    );
  }
  if (!(await checkArtistAssignment(role, email, artist))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const cleanTracks = [];
  for (const [i, t] of tracks.entries()) {
    if (!t.fonograma || !t.fonograma.trim()) {
      return NextResponse.json(
        { error: `Falta el nombre de la canción #${i + 1}.` },
        { status: 400 }
      );
    }
    if (!t.artist || !t.artist.trim()) {
      return NextResponse.json(
        { error: `Falta el artista principal de "${t.fonograma}".` },
        { status: 400 }
      );
    }
    const dup = await findDuplicateRelease(t.artist, t.fonograma, fecha || null);
    if (dup) {
      return NextResponse.json(
        { error: `Ya existe un lanzamiento de "${t.artist}" llamado "${t.fonograma}" en esa fecha.` },
        { status: 409 }
      );
    }
    cleanTracks.push({
      trackNumber: t.trackNumber ?? i + 1,
      fonograma: t.fonograma.trim(),
      artist: t.artist.trim(),
      colaboradores: t.colaboradores?.trim() || null,
      productor: t.productor?.trim() || null,
      isrc: t.isrc?.trim() || null,
      audioUrl: t.audioUrl || null,
      portadaUrl: t.portadaUrl || null,
      comentario: t.comentario?.trim() || null,
    });
  }

  const { group, tracks: savedTracks } = await createGroupedRelease(
    {
      tipo,
      artist,
      sello,
      streamingProject,
      nombre,
      estado: estado as EstadoRelease,
      distribuidora: distribuidora || null,
      fecha: fecha || null,
      hora: horaNorm,
      comentarios: comentarios || null,
      createdBy: email,
    },
    cleanTracks
  );

  const company = canonicalCompany(distribuidora);
  for (let i = 0; i < savedTracks.length; i++) {
    const saved = savedTracks[i];
    const input = cleanTracks[i];
    await upsertTrackFromRelease({
      id: `pm-${saved.id}`,
      track: input.fonograma,
      album: nombre,
      releaseDate: fecha || null,
      company,
      artistDisplay: [input.artist, ...(input.colaboradores ? [input.colaboradores] : [])].join("|"),
      participants: buildParticipants(input.artist, input.colaboradores),
      sello,
      streamingProject,
    });
  }

  waitUntil(
    notifyNewLanzamiento({
      tipo,
      artist,
      sello,
      streamingProject,
      nombre,
      estado: estado as EstadoRelease,
      distribuidora: distribuidora || null,
      fecha: fecha || null,
      hora: horaNorm,
      comentarios: comentarios || null,
      tracks: cleanTracks.map((t, i) => ({
        trackNumber: t.trackNumber ?? i + 1,
        fonograma: t.fonograma,
        artist: t.artist,
        colaboradores: t.colaboradores,
        productor: t.productor,
        isrc: t.isrc,
        comentario: t.comentario,
        audioUrl: t.audioUrl,
        portadaUrl: t.portadaUrl,
      })),
      createdBy: email,
    }).catch((err) => console.error("notifyNewLanzamiento failed:", err))
  );

  return NextResponse.json({ group, tracks: savedTracks }, { status: 201 });
}
