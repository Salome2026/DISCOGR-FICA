import { NextRequest, NextResponse } from "next/server";
import { seguimientoUser } from "./_auth";
import { getSeguimientoOverview, createUnit, TIPOS_UNIDAD, type TipoUnidad } from "@/lib/db/seguimiento";

export async function GET(req: NextRequest) {
  if (!(await seguimientoUser(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const data = await getSeguimientoOverview();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await seguimientoUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json()) as { tipo?: string; name?: string; sello?: string | null; info?: string | null };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  if (!TIPOS_UNIDAD.includes(body.tipo as TipoUnidad)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }
  const unit = await createUnit(
    { tipo: body.tipo as TipoUnidad, name, sello: body.sello?.trim() || null, info: body.info?.trim() || null },
    user.email
  );
  return NextResponse.json({ unit }, { status: 201 });
}
