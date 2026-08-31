import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { setGenreTrendSignalActive } from "@/lib/db/arGenreTrends";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }
  const body = (await req.json()) as { active?: boolean };
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Falta indicar 'active'." }, { status: 400 });
  }
  const signal = await setGenreTrendSignalActive(numericId, body.active);
  if (!signal) {
    return NextResponse.json({ error: "Señal no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ signal });
}
