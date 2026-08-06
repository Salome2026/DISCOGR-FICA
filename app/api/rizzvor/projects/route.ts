import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import {
  listProjects,
  createProject,
  RIZZVOR_PROJECT_PRIORITIES,
} from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function GET(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sello = req.nextUrl.searchParams.get("sello") || undefined;
  const projects = await listProjects(sello);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { artistName, sello, genero, priority, responsableEmail, fechaEstimada, horaEstimada, distribuidora, notas } = body as {
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

  if (!artistName || !artistName.trim()) {
    return NextResponse.json({ error: "El nombre del artista es obligatorio." }, { status: 400 });
  }
  const priorityValue = priority && RIZZVOR_PROJECT_PRIORITIES.includes(priority as (typeof RIZZVOR_PROJECT_PRIORITIES)[number])
    ? priority
    : "Media";

  const project = await createProject(
    {
      artistName: artistName.trim(),
      sello: sello || "Rizzvor",
      genero: genero || null,
      priority: priorityValue,
      responsableEmail: responsableEmail || null,
      fechaEstimada: fechaEstimada || null,
      horaEstimada: horaEstimada || null,
      distribuidora: distribuidora || null,
      notas: notas || null,
    },
    user.email
  );

  return NextResponse.json({ project });
}
