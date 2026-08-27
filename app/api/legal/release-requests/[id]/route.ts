import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getReleaseRequest, markReleaseRequestSent } from "@/lib/db/legalReleaseRequests";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const request = await getReleaseRequest(id);
  if (!request) return NextResponse.json({ error: "No encontramos ese Release." }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "marcar_enviado") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const request = await markReleaseRequestSent(id, user.email);
  if (!request) return NextResponse.json({ error: "Ese Release ya no está pendiente." }, { status: 400 });
  return NextResponse.json({ request });
}
