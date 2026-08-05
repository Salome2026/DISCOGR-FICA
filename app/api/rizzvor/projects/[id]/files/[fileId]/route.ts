import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { removeFile } from "@/lib/db/rizzvorProjects";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "editar_rizzvor_proyectos")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { fileId } = await params;
  await removeFile(Number(fileId), user.email);
  return NextResponse.json({ ok: true });
}
