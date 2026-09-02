import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getLaunch, markLaunchReviewed, listLaunchComments, canAccessLaunch } from "@/lib/db/cmLaunches";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const launch = await getLaunch(id);
  if (!launch) return NextResponse.json({ error: "Lanzamiento no encontrado." }, { status: 404 });
  if (!(await canAccessLaunch({ email: user.email, roles: user.roles }, launch))) {
    return NextResponse.json({ error: "No tenés acceso a este lanzamiento." }, { status: 403 });
  }
  const comments = await listLaunchComments(id);
  return NextResponse.json({ launch, comments });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const launch = await getLaunch(id);
  if (!launch) return NextResponse.json({ error: "Lanzamiento no encontrado." }, { status: 404 });
  if (!(await canAccessLaunch({ email: user.email, roles: user.roles }, launch))) {
    return NextResponse.json({ error: "No tenés acceso a este lanzamiento." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (body?.revisado === true) {
    await markLaunchReviewed(id, user.email);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
}
