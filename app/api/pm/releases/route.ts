import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createRelease,
  createGroupedRelease,
  findDuplicateRelease,
  listReleasesFor,
  type EstadoRelease,
} from "@/lib/db/releases";
import { getAssignedArtists } from "@/lib/db/users";
import { notifyNewLanzamiento } from "@/lib/email";

const ESTADOS: EstadoRelease[] = ["Contactado", "Firmado", "Necesito ayuda"];

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
  if (role !== "project_manager" && role !== "artista" && role !== "representante") return true;
  const assigned = await getAssignedArtists(email);
  return assigned.map((a) => a.toLowerCase()).includes(String(artist).toLowerCase());
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

  if (tipo === "ep" || tipo === "album") {
    return handleGroupedCreate(body, tipo, role, email);
  }
  return handleSingleCreate(body, role, email);
}

async function handleSingleCreate(
  body: Record<string, unknown>,
  role: string,
  email: string
) {
  const { artist, sello, fonograma, estado, distribuidora, fecha, autoresCompositores, audioUrl, portadaUrl } = body as {
    artist?: string; sello?: string; fonograma?: string; estado?: string; distribuidora?: string;
    fecha?: string; autoresCompositores?: string; audioUrl?: string; portadaUrl?: string;
  };

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
    sello: sello || null,
    fonograma,
    estado: estado as EstadoRelease,
    distribuidora: distribuidora || null,
    fecha: fecha || null,
    autoresCompositores: autoresCompositores || null,
    audioUrl: audioUrl || null,
    portadaUrl: portadaUrl || null,
    createdBy: email,
  });

  notifyNewLanzamiento({
    artist,
    fonograma,
    sello: sello || null,
    estado: estado as EstadoRelease,
    distribuidora: distribuidora || null,
    fecha: fecha || null,
    autoresCompositores: autoresCompositores || null,
    audioUrl: audioUrl || null,
    portadaUrl: portadaUrl || null,
    createdBy: email,
  }).catch((err) => console.error("notifyNewLanzamiento failed:", err));

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
  email: string
) {
  const { artist, sello, nombre, estado, distribuidora, fecha, comentarios, tracks } = body as {
    artist?: string; sello?: string; nombre?: string; estado?: string; distribuidora?: string;
    fecha?: string; comentarios?: string; tracks?: TrackInput[];
  };

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
      sello: sello || null,
      nombre,
      estado: estado as EstadoRelease,
      distribuidora: distribuidora || null,
      fecha: fecha || null,
      comentarios: comentarios || null,
      createdBy: email,
    },
    cleanTracks
  );

  notifyNewLanzamiento({
    artist,
    fonograma: `${tipo === "ep" ? "EP" : "Álbum"} "${nombre}" (${savedTracks.length} canciones)`,
    sello: sello || null,
    estado: estado as EstadoRelease,
    distribuidora: distribuidora || null,
    fecha: fecha || null,
    autoresCompositores: null,
    audioUrl: null,
    portadaUrl: null,
    createdBy: email,
  }).catch((err) => console.error("notifyNewLanzamiento failed:", err));

  return NextResponse.json({ group, tracks: savedTracks }, { status: 201 });
}
