import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { updateAction, deleteAction, ANNUAL_PLAN_ACTION_STATUSES } from "@/lib/db/pmAnnualPlan";

async function checkAccess(req: NextRequest, artistId: string) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) return null;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ artistId: string; actionId: string }> }) {
  const { artistId, actionId } = await params;
  const user = await checkAccess(req, artistId);
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const { descripcion, responsable, fechaLimite, estado, customLabel } = body as {
    descripcion?: string | null; responsable?: string | null; fechaLimite?: string | null; estado?: string; customLabel?: string | null;
  };
  if (estado !== undefined && !(ANNUAL_PLAN_ACTION_STATUSES as readonly string[]).includes(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const action = await updateAction(Number(actionId), artistId, { descripcion, responsable, fechaLimite, estado, customLabel }, user.email);
  if (!action) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ action });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ artistId: string; actionId: string }> }) {
  const { artistId, actionId } = await params;
  const user = await checkAccess(req, artistId);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  await deleteAction(Number(actionId), artistId);
  return NextResponse.json({ ok: true });
}
