import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getOpParticipacion, updateOpParticipacion, deleteOpParticipacion } from "@/lib/db/opParticipaciones";
import type { OpParticipacionInput } from "@discografica/shared/types/op";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const row = await getOpParticipacion(id);
  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as OpParticipacionInput | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const row = await updateOpParticipacion(id, body, user.email);
  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ row });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteOpParticipacion(id, user.email);
  if (!ok) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
