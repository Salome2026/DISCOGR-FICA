import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { acknowledgeAlert } from "@/lib/db/arAlerts";

// A propósito editar_ar y no ver_ar: un PM que solo ve oportunidades
// asignadas no debería poder descartar en silencio una alerta que el
// equipo de A&R todavía no vio.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const alertId = Number(id);
  if (!Number.isInteger(alertId)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }
  const alert = await acknowledgeAlert(alertId, user.email);
  if (!alert) return NextResponse.json({ error: "No encontramos esa alerta (o ya estaba vista)." }, { status: 404 });
  return NextResponse.json({ alert });
}
