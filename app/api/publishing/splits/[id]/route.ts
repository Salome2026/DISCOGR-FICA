import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getSplit, markSplitSent } from "@/lib/db/editorialSplits";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const split = await getSplit(id);
  if (!split) return NextResponse.json({ error: "No encontramos ese split." }, { status: 404 });
  return NextResponse.json({ split });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "marcar_enviado") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const split = await markSplitSent(id, user.email);
  if (!split) return NextResponse.json({ error: "Ese split ya no está pendiente." }, { status: 400 });
  return NextResponse.json({ split });
}
