import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listOpIsrcVideo, createOpIsrcVideo } from "@/lib/db/opIsrc";
import type { OpIsrcVideoInput } from "@discografica/shared/types/op";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await listOpIsrcVideo();
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as OpIsrcVideoInput | null;
  if (!body?.year) return NextResponse.json({ error: "El año es obligatorio." }, { status: 400 });
  const row = await createOpIsrcVideo(body, user.email);
  return NextResponse.json({ row });
}
