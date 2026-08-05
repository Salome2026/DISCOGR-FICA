import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { toggleChecklistItem, removeChecklistItem } from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { itemId } = await params;
  const { done } = (await req.json()) as { done?: boolean };
  const item = await toggleChecklistItem(Number(itemId), !!done, user.email);
  if (!item) return NextResponse.json({ error: "Ítem no encontrado." }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { itemId } = await params;
  await removeChecklistItem(Number(itemId), user.email);
  return NextResponse.json({ ok: true });
}
