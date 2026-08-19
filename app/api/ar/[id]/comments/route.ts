import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listComments, addComment } from "@/lib/db/arOpportunities";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const comments = await listComments(id);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as { body?: string };
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "El comentario no puede estar vacío." }, { status: 400 });
  }
  const comment = await addComment(id, user.email, body.body.trim());
  return NextResponse.json({ comment });
}
