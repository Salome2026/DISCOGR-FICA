import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import {
  getProject,
  listSongs,
  listFiles,
  claimConversion,
  finalizeConversion,
  releaseConversionClaim,
  setSongConvertedRelease,
} from "@/lib/db/rizzvorProjects";
import { createRelease, createGroupedRelease, findDuplicateRelease, type EstadoRelease } from "@/lib/db/releases";
import { upsertTrackFromRelease } from "@/lib/db/catalog";
import { notifyNewLanzamiento } from "@/lib/email";

const PORTADA_SIZE = 3000;
const ESTADOS: EstadoRelease[] = ["Contactado", "Firmado", "Necesito ayuda"];

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

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { distribuidora, fecha, hora, estado, tipoOverride } = body as {
    distribuidora?: string | null;
    fecha?: string | null;
    hora?: string | null;
    estado?: string;
    tipoOverride?: "single" | "ep" | "album";
  };

  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  if (project.convertedAt) {
    return NextResponse.json({ error: "Este proyecto ya fue convertido a lanzamiento." }, { status: 409 });
  }

  const songs = await listSongs(id);
  const files = await listFiles(id);
  if (songs.length === 0) {
    return NextResponse.json({ error: "El proyecto no tiene canciones cargadas." }, { status: 400 });
  }

  // Server-side re-validation — never trust the client-only pre-flight
  // checks, this is the real data-integrity boundary.
  const fileById = new Map(files.map((f) => [f.id, f]));
  const problems: string[] = [];
  for (const song of songs) {
    const wav = song.audioWavFileId ? fileById.get(song.audioWavFileId) : null;
    if (!wav) problems.push(`"${song.fonograma}": falta el audio WAV.`);
    const portada = song.portadaFileId ? fileById.get(song.portadaFileId) : null;
    if (!portada) {
      problems.push(`"${song.fonograma}": falta la portada.`);
    } else if (portada.width !== PORTADA_SIZE || portada.height !== PORTADA_SIZE) {
      problems.push(`"${song.fonograma}": la portada es ${portada.width}x${portada.height}px, necesita ${PORTADA_SIZE}x${PORTADA_SIZE}px.`);
    }
  }
  if (problems.length > 0) {
    return NextResponse.json({ error: "Faltan datos para convertir a lanzamiento.", details: problems }, { status: 400 });
  }

  const finalDistribuidora = distribuidora ?? project.distribuidora;
  const finalFecha = fecha ?? project.fechaEstimada;
  const finalHora = hora ?? project.horaEstimada ?? "00:00";
  const finalEstado = estado && ESTADOS.includes(estado as EstadoRelease) ? (estado as EstadoRelease) : "Firmado";
  const tipo = tipoOverride ?? (songs.length === 1 ? "single" : "ep");

  const claimed = await claimConversion(id, user.email);
  if (!claimed) {
    return NextResponse.json({ error: "Este proyecto ya fue convertido a lanzamiento." }, { status: 409 });
  }

  try {
    if (tipo === "single") {
      const song = songs[0];
      const dup = await findDuplicateRelease(project.artistName, song.fonograma, finalFecha);
      if (dup) throw new Error(`Ya existe un lanzamiento de "${project.artistName}" llamado "${song.fonograma}" en esa fecha.`);

      const wav = fileById.get(song.audioWavFileId!)!;
      const portada = fileById.get(song.portadaFileId!)!;

      const release = await createRelease({
        artist: project.artistName,
        sello: project.sello,
        streamingProject: null,
        fonograma: song.fonograma,
        estado: finalEstado,
        distribuidora: finalDistribuidora,
        fecha: finalFecha,
        hora: finalHora,
        autoresCompositores: song.autoresCompositores,
        colaboradores: song.colaboradores,
        isrc: song.isrc,
        genero: project.genero,
        audioUrl: wav.url,
        portadaUrl: portada.url,
        createdBy: user.email,
      });

      await upsertTrackFromRelease({
        id: `pm-${release.id}`,
        track: song.fonograma,
        album: null,
        releaseDate: finalFecha,
        company: canonicalCompany(finalDistribuidora),
        artistDisplay: project.artistName,
        participants: buildParticipants(project.artistName, song.colaboradores),
        sello: project.sello,
        streamingProject: null,
        isrc: song.isrc,
        genero: project.genero,
      });
      await setSongConvertedRelease(song.id, release.id);
      await finalizeConversion(id, { releaseId: release.id, groupId: null }, user.email);

      waitUntil(
        notifyNewLanzamiento({
          tipo: "single",
          artist: project.artistName,
          sello: project.sello,
          streamingProject: null,
          fonograma: song.fonograma,
          estado: finalEstado,
          distribuidora: finalDistribuidora,
          fecha: finalFecha,
          hora: finalHora,
          autoresCompositores: song.autoresCompositores,
          colaboradores: song.colaboradores,
          audioUrl: wav.url,
          portadaUrl: portada.url,
          createdBy: user.email,
        }).catch((err) => console.error("notifyNewLanzamiento failed:", err))
      );

      return NextResponse.json({ ok: true, releaseId: release.id, groupId: null });
    }

    // ep / album
    for (const song of songs) {
      const dup = await findDuplicateRelease(project.artistName, song.fonograma, finalFecha);
      if (dup) throw new Error(`Ya existe un lanzamiento de "${project.artistName}" llamado "${song.fonograma}" en esa fecha.`);
    }

    const cleanTracks = songs.map((song, i) => {
      const wav = fileById.get(song.audioWavFileId!)!;
      const portada = fileById.get(song.portadaFileId!)!;
      return {
        trackNumber: song.trackNumber ?? i + 1,
        fonograma: song.fonograma,
        artist: song.artistPrincipal || project.artistName,
        colaboradores: song.colaboradores,
        productor: song.productor,
        isrc: song.isrc,
        genero: project.genero,
        audioUrl: wav.url,
        portadaUrl: portada.url,
        comentario: song.comentario,
      };
    });

    const { group, tracks: savedTracks } = await createGroupedRelease(
      {
        tipo,
        artist: project.artistName,
        sello: project.sello,
        streamingProject: null,
        nombre: `${project.artistName} — ${tipo === "ep" ? "EP" : "Álbum"}`,
        estado: finalEstado,
        distribuidora: finalDistribuidora,
        fecha: finalFecha,
        hora: finalHora,
        comentarios: project.notas,
        createdBy: user.email,
      },
      cleanTracks
    );

    const company = canonicalCompany(finalDistribuidora);
    for (let i = 0; i < savedTracks.length; i++) {
      const saved = savedTracks[i];
      const input = cleanTracks[i];
      await upsertTrackFromRelease({
        id: `pm-${saved.id}`,
        track: input.fonograma,
        album: group.nombre,
        releaseDate: finalFecha,
        company,
        artistDisplay: [input.artist, ...(input.colaboradores ? [input.colaboradores] : [])].join("|"),
        participants: buildParticipants(input.artist, input.colaboradores),
        sello: project.sello,
        streamingProject: null,
        isrc: input.isrc,
        genero: input.genero,
      });
      await setSongConvertedRelease(songs[i].id, saved.id);
    }
    await finalizeConversion(id, { releaseId: null, groupId: group.id }, user.email);

    waitUntil(
      notifyNewLanzamiento({
        tipo,
        artist: project.artistName,
        sello: project.sello,
        streamingProject: null,
        nombre: group.nombre,
        estado: finalEstado,
        distribuidora: finalDistribuidora,
        fecha: finalFecha,
        hora: finalHora,
        comentarios: project.notas,
        tracks: cleanTracks,
        createdBy: user.email,
      }).catch((err) => console.error("notifyNewLanzamiento failed:", err))
    );

    return NextResponse.json({ ok: true, releaseId: null, groupId: group.id });
  } catch (err) {
    await releaseConversionClaim(id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo convertir el proyecto a lanzamiento." },
      { status: 400 }
    );
  }
}
