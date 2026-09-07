import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getOpRepertorioCapif, updateOpRepertorioCapif, deleteOpRepertorioCapif } from "@/lib/db/opRepertorioCapif";
import type { OpRepertorioCapifInput } from "@discografica/shared/types/op";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const row = await getOpRepertorioCapif(id);
  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as OpRepertorioCapifInput | null;
  if (!body?.isrc?.trim()) return NextResponse.json({ error: "El ISRC es obligatorio." }, { status: 400 });
  const row = await updateOpRepertorioCapif(id, body, user.email);
  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ row });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteOpRepertorioCapif(id, user.email);
  if (!ok) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
