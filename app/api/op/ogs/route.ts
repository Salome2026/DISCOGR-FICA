import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listOpOgs, createOpOgs } from "@/lib/db/opOgs";
import type { OpOgsInput } from "@discografica/shared/types/op";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rows = await listOpOgs();
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as OpOgsInput | null;
  if (!body?.trackArtist?.trim() || !body?.track?.trim()) {
    return NextResponse.json({ error: "Track artist y track son obligatorios." }, { status: 400 });
  }
  const row = await createOpOgs(body, user.email);
  return NextResponse.json({ row });
}
