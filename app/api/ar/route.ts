import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listOpportunitiesFor, createManualOpportunity } from "@/lib/db/arOpportunities";
import { AR_CATEGORIES, AR_SUBJECT_TYPES, type ArOpportunityInput } from "@discografica/shared/types/ar";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const opportunities = await listOpportunitiesFor(user.email, user.role ?? "");
  return NextResponse.json({ opportunities });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json()) as ArOpportunityInput;
  if (!body.title?.trim() || !body.subjectName?.trim()) {
    return NextResponse.json({ error: "Faltan campos obligatorios: título y nombre del sujeto." }, { status: 400 });
  }
  if (!AR_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
  }
  if (!AR_SUBJECT_TYPES.includes(body.subjectType)) {
    return NextResponse.json({ error: "Tipo de sujeto inválido." }, { status: 400 });
  }
  if (!body.sources || body.sources.length === 0) {
    return NextResponse.json({ error: "Toda oportunidad necesita al menos una fuente." }, { status: 400 });
  }

  const opportunity = await createManualOpportunity(body, user.email);
  return NextResponse.json({ opportunity });
}
