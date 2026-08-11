import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getRoute } from "@/lib/routing";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { origin, destination } = (await req.json()) as {
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
  };
  if (!origin || !destination) {
    return NextResponse.json({ error: "Faltan coordenadas de origen/destino." }, { status: 400 });
  }

  const route = await getRoute(origin, destination);
  if (!route) {
    return NextResponse.json({ resolved: false });
  }
  return NextResponse.json({
    resolved: true,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    geometry: route.geometry,
  });
}
