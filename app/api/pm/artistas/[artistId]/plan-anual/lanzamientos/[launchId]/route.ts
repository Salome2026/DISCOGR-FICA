import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { updateLaunch, deleteLaunch } from "@/lib/db/pmAnnualPlan";

async function checkAccess(req: NextRequest, artistId: string) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) return null;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string; launchId: string }> }) {
  const { artistId, launchId } = await params;
  const user = await checkAccess(req, artistId);
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const { titulo, fechaObjetivo, objetivo, notas, sortOrder } = body as {
    titulo?: string; fechaObjetivo?: string; objetivo?: string | null; notas?: string | null; sortOrder?: number;
  };
  const launch = await updateLaunch(Number(launchId), artistId, { titulo, fechaObjetivo, objetivo, notas, sortOrder }, user.email);
  if (!launch) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ launch });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ artistId: string; launchId: string }> }) {
  const { artistId, launchId } = await params;
  const user = await checkAccess(req, artistId);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  await deleteLaunch(Number(launchId), artistId);
  return NextResponse.json({ ok: true });
}
