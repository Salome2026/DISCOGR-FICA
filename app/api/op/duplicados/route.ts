import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listOpDuplicados, createOpDuplicado } from "@/lib/db/opDuplicados";
import type { OpDuplicadoInput } from "@discografica/shared/types/op";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await listOpDuplicados();
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as OpDuplicadoInput | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const row = await createOpDuplicado(body, user.email);
  return NextResponse.json({ row });
}
