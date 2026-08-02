import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createRelease,
  findDuplicateRelease,
  listReleasesFor,
  type EstadoRelease,
} from "@/lib/db/releases";
import { getAssignedArtists } from "@/lib/db/users";

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

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;
  if (!email || role === "sin_acceso" || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { artist, sello, fonograma, estado, distribuidora, fecha, autoresCompositores, audioUrl, portadaUrl } = body;

  if (!artist || !fonograma || !estado) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios: artista, fonograma y estado." },
      { status: 400 }
    );
  }
  if (!ESTADOS.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  if (fecha && Number.isNaN(Date.parse(fecha))) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  if (role === "project_manager" || role === "artista" || role === "representante") {
    const assigned = await getAssignedArtists(email);
    if (!assigned.map((a) => a.toLowerCase()).includes(String(artist).toLowerCase())) {
      return NextResponse.json(
        { error: "No tenés este artista asignado." },
        { status: 403 }
      );
    }
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
    estado,
    distribuidora: distribuidora || null,
    fecha: fecha || null,
    autoresCompositores: autoresCompositores || null,
    audioUrl: audioUrl || null,
    portadaUrl: portadaUrl || null,
    createdBy: email,
  });

  return NextResponse.json({ release }, { status: 201 });
}
