import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listOpTemp, createOpTemp } from "@/lib/db/opTemp";
import type { OpTempInput } from "@discografica/shared/types/op";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await listOpTemp();
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as OpTempInput | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const row = await createOpTemp(body, user.email);
  return NextResponse.json({ row });
}
