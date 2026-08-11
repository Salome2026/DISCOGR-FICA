import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listHojas, createHoja, ESTADOS_HOJA, type HojaInput } from "@/lib/db/tourManager";

async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}

type HojaBody = Omit<HojaInput, "actorEmail" | "estado"> & { estado?: string };

export async function GET() {
  const user = await sessionUser();
  if (!user || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const hojas = await listHojas();
  return NextResponse.json({ hojas });
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
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

  const hoja = await createHoja({
    ...body,
    estado: body.estado || "Borrador",
    actorEmail: user.email,
  });
  return NextResponse.json({ hoja });
}
