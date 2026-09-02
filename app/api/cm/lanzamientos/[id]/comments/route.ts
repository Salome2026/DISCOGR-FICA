import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getLaunch, canAccessLaunch, addLaunchComment, listLaunchComments } from "@/lib/db/cmLaunches";

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
  return NextResponse.json({ comments: await listLaunchComments(id) });
}

// Ambos, PM y CM, comentan acá — mismo hilo, mismo historial (pedido
// explícito: "deben trabajar sobre el mismo lanzamiento y visualizar el
// mismo historial de comentarios").
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "El comentario no puede estar vacío." }, { status: 400 });
  await addLaunchComment(id, user.email, text);
  return NextResponse.json({ ok: true }, { status: 201 });
}
