import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updateStreamingProject } from "@/lib/db/streamingProjects";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.includes("admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const patch: { name?: string; active?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.active === "boolean") patch.active = body.active;

  const project = await updateStreamingProject(Number(id), patch);
  if (!project) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ project });
}
