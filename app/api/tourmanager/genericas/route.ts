import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listHojasGenericas, createHojaGenerica } from "@/lib/db/tourManagerGenericas";
import { computeGenericShowRoutes } from "@/lib/tourManagerRoute";
import type { HojaGenericaBody } from "@discografica/shared/types/tourManager";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const archived = req.nextUrl.searchParams.get("archived") === "1";
  const hojas = await listHojasGenericas({ archived });
  return NextResponse.json({ hojas });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json()) as HojaGenericaBody;
  if (!body.artistName?.trim()) {
    return NextResponse.json({ error: "Falta el artista." }, { status: 400 });
  }
  if (!Array.isArray(body.shows) || body.shows.length === 0) {
    return NextResponse.json({ error: "Agregá al menos un show." }, { status: 400 });
  }

  const shows = await computeGenericShowRoutes(body.shows);
  const hoja = await createHojaGenerica({ ...body, shows, actorEmail: user.email });
  return NextResponse.json({ hoja });
}
