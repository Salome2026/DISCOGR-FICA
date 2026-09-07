import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listOpRepertorioCapif, createOpRepertorioCapif } from "@/lib/db/opRepertorioCapif";
import type { OpRepertorioCapifInput } from "@discografica/shared/types/op";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await listOpRepertorioCapif();
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as OpRepertorioCapifInput | null;
  if (!body?.isrc?.trim()) return NextResponse.json({ error: "El ISRC es obligatorio." }, { status: 400 });
  const row = await createOpRepertorioCapif(body, user.email);
  return NextResponse.json({ row });
}
