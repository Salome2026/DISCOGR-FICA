import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getOpportunity, canSeeOpportunity, assignToPm, listAssignmentsForOpportunity } from "@/lib/db/arOpportunities";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canSeeOpportunity(user, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const assignments = await listAssignmentsForOpportunity(id);
  return NextResponse.json({ assignments });
}

// Only admin/ar can assign — a PM can't assign an opportunity to
// themselves or to another PM, matching how listOpportunitiesFor()'s
// PM-scoping branch treats assignment as something done *to* a PM, not
// *by* one.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || (user.role !== "admin" && user.role !== "ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) {
    return NextResponse.json({ error: "Oportunidad no encontrada." }, { status: 404 });
  }
  const body = (await req.json()) as { pmEmail?: string; comment?: string | null };
  if (!body.pmEmail?.trim()) {
    return NextResponse.json({ error: "Falta elegir un PM." }, { status: 400 });
  }
  const assignment = await assignToPm(id, body.pmEmail.trim(), body.comment?.trim() || null, user.email);
  return NextResponse.json({ assignment });
}
