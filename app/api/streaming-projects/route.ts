import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  listActiveStreamingProjects,
  listAllStreamingProjects,
  createStreamingProject,
} from "@/lib/db/streamingProjects";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  if (all && !user.roles?.includes("admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const projects = all ? await listAllStreamingProjects() : await listActiveStreamingProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const email = user?.email;
  if (!email || !user?.roles?.includes("admin")) {
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
