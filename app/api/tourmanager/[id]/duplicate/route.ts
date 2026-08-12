import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { duplicateHoja } from "@/lib/db/tourManager";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const hoja = await duplicateHoja(id, user.email);
  if (!hoja) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ hoja });
}
