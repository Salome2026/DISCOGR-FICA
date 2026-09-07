import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getOpportunity, updateOpportunity, canSeeOpportunity } from "@/lib/db/arOpportunities";
import { AR_CATEGORIES, AR_STATUSES, type ArOpportunityUpdate } from "@discografica/shared/types/ar";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) {
    return NextResponse.json({ error: "Oportunidad no encontrada." }, { status: 404 });
  }
  if (!(await canSeeOpportunity(user, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // La evaluación de scouting cita por nombre otras oportunidades/decisiones
  // (para poder comparar candidatos) que quien ve ESTA oportunidad podría no
  // tener permiso de ver directamente (ej. un PM asignado acá, pero no a la
  // oportunidad citada) — se redacta para cualquiera sin editar_ar, el mismo
  // permiso que ya hace falta para generarla.
  if (opportunity.narrative?.scoutingAssessment && !hasPermission(user, "editar_ar")) {
    const narrativeWithoutScouting = { ...opportunity.narrative };
    delete narrativeWithoutScouting.scoutingAssessment;
    return NextResponse.json({ opportunity: { ...opportunity, narrative: narrativeWithoutScouting } });
  }

  return NextResponse.json({ opportunity });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canSeeOpportunity(user, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json()) as ArOpportunityUpdate;
  if (body.status && !AR_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  if (body.category && !AR_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
  }
  const opportunity = await updateOpportunity(id, body, user.email);
  if (!opportunity) {
    return NextResponse.json({ error: "Oportunidad no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ opportunity });
}
