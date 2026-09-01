import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { toggleActionItem, removeActionItem } from "@/lib/db/pmArtistWorkspace";

async function checkAccess(req: NextRequest, artistId: string) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) return null;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string; itemId: string }> }) {
  const { artistId, itemId } = await params;
  const user = await checkAccess(req, artistId);
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const done = Boolean((body as { done?: boolean }).done);
  const item = await toggleActionItem(Number(itemId), artistId, done, user.email);
  if (!item) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ artistId: string; itemId: string }> }) {
  const { artistId, itemId } = await params;
  const user = await checkAccess(req, artistId);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  await removeActionItem(Number(itemId), artistId);
  return NextResponse.json({ ok: true });
}
