import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { getRoute } from "@/lib/routing";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
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
