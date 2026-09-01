import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getHoja, updateHoja, deleteHoja, ESTADOS_HOJA, type HojaInput } from "@/lib/db/tourManager";

type HojaBody = Omit<HojaInput, "actorEmail" | "estado"> & { estado?: string };

// All handlers accept either the web cookie session or a mobile Bearer token.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const hoja = await getHoja(id);
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ hoja });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as HojaBody;
  if (!body.artistName || !body.fecha) {
    return NextResponse.json({ error: "Faltan campos obligatorios: artista y fecha." }, { status: 400 });
  }
  if (body.estado && !ESTADOS_HOJA.includes(body.estado as (typeof ESTADOS_HOJA)[number])) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  // Only overwritten when recalculation actually resolves something — a
  // transient OSRM hiccup on this save should never wipe out a route that
  // computed fine on a previous one (updateHoja preserves it whenever this
  // key is left out of the payload entirely).
  // Dynamic import: kept out of GET/DELETE's module graph — see
  // app/api/tourmanager/route.ts for why (sharp's native binary).
  const { computeRutaCompleta } = await import("@/lib/tourManagerRoute");
  const rutaCompletaGeojson = await computeRutaCompleta(body);

  const hoja = await updateHoja(id, {
    ...body,
    ...(rutaCompletaGeojson != null ? { rutaCompletaGeojson } : {}),
    estado: body.estado || "Borrador",
    actorEmail: user.email,
  });
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ hoja });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await deleteHoja(id, user.email);
  return NextResponse.json({ ok: true });
}
