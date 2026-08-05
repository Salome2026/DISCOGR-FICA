import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listComments, addComment } from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

// Only GET/POST on purpose — no PATCH/DELETE anywhere in this module.
// Comments are appended over time and never overwritten; that's enforced
// here, not just by convention.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const comments = await listComments(id);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { body } = (await req.json()) as { body?: string };
  if (!body || !body.trim()) {
    return NextResponse.json({ error: "El comentario no puede estar vacío." }, { status: 400 });
  }
  const comment = await addComment(id, user.email, body.trim());
  return NextResponse.json({ comment });
}
