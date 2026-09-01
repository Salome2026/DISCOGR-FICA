import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listHojas, createHoja, ESTADOS_HOJA, type HojaInput } from "@/lib/db/tourManager";

type HojaBody = Omit<HojaInput, "actorEmail" | "estado"> & { estado?: string };

// Both GET and POST accept either the web cookie session or a mobile
// Bearer token via getSessionUser.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const archived = req.nextUrl.searchParams.get("archived") === "1";
  const hojas = await listHojas({ archived });
  return NextResponse.json({ hojas });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json()) as HojaBody;
  if (!body.artistName || !body.fecha) {
    return NextResponse.json({ error: "Faltan campos obligatorios: artista y fecha." }, { status: 400 });
  }
  if (body.estado && !ESTADOS_HOJA.includes(body.estado as (typeof ESTADOS_HOJA)[number])) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  // Dynamic import: this module pulls in lib/staticMap.ts, which loads
  // sharp's native binary — kept out of GET's module graph so listing
  // hojas never pays that cost (or fails if sharp isn't loadable).
  const { computeRutaCompleta } = await import("@/lib/tourManagerRoute");
  const rutaCompletaGeojson = await computeRutaCompleta(body);

  const hoja = await createHoja({
    ...body,
    rutaCompletaGeojson,
    estado: body.estado || "Borrador",
    actorEmail: user.email,
  });
  return NextResponse.json({ hoja });
}
