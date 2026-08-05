import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import {
  getProject,
  updateProject,
  setProjectStatus,
  archiveProject,
  listSongs,
  listFiles,
  listChecklist,
  RIZZVOR_PROJECT_STATUSES,
} from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });

  const [songs, files, checklist] = await Promise.all([listSongs(id), listFiles(id), listChecklist(id)]);
  return NextResponse.json({ project, songs, files, checklist });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { status, ...rest } = body as {
    status?: string;
    artistName?: string;
    sello?: string;
    genero?: string | null;
    priority?: string;
    responsableEmail?: string | null;
    fechaEstimada?: string | null;
    horaEstimada?: string | null;
    distribuidora?: string | null;
    notas?: string | null;
  };

  if (status !== undefined) {
    if (!RIZZVOR_PROJECT_STATUSES.includes(status as (typeof RIZZVOR_PROJECT_STATUSES)[number])) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    const updated = await setProjectStatus(id, status, user.email);
    if (!updated) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    if (Object.keys(rest).length === 0) return NextResponse.json({ project: updated });
  }

  if (Object.keys(rest).length > 0) {
    const project = await updateProject(id, rest, user.email);
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    return NextResponse.json({ project });
  }

  const project = await getProject(id);
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await archiveProject(id, user.email);
  return NextResponse.json({ ok: true });
}
