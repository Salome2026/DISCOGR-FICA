import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listActiveStreamingProjects,
  listAllStreamingProjects,
  createStreamingProject,
} from "@/lib/db/streamingProjects";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.email || role === "sin_acceso" || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  if (all && role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const projects = all ? await listAllStreamingProjects() : await listActiveStreamingProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;
  if (!email || role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  try {
    const project = await createStreamingProject(name, email);
    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un proyecto con ese nombre." }, { status: 409 });
  }
}
