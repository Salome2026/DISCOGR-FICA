import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getHojaGenerica, updateHojaGenerica, archiveHojaGenerica } from "@/lib/db/tourManagerGenericas";
import type { HojaGenericaBody } from "@discografica/shared/types/tourManager";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const hoja = await getHojaGenerica(id);
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ hoja });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as HojaGenericaBody;
  if (!body.artistName?.trim()) {
    return NextResponse.json({ error: "Falta el artista." }, { status: 400 });
  }
  if (!Array.isArray(body.shows) || body.shows.length === 0) {
    return NextResponse.json({ error: "Agregá al menos un show." }, { status: 400 });
  }
  // Dynamic import: kept out of GET/DELETE's module graph — see
  // app/api/tourmanager/route.ts for why (sharp's native binary).
  const { computeGenericShowRoutes } = await import("@/lib/tourManagerRoute");
  const shows = await computeGenericShowRoutes(body.shows);
  const hoja = await updateHojaGenerica(id, { ...body, shows, actorEmail: user.email });
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ hoja });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await archiveHojaGenerica(id, user.email);
  return NextResponse.json({ ok: true });
}
