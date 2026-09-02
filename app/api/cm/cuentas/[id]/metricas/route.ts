import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { canCmAccessAccount } from "@/lib/db/cmAccounts";
import { getAccountGrowth, getAccountMetricsHistory, getTopContentByMetric, type ContentMetric } from "@/lib/db/cmMetrics";
import { listContentForAccount } from "@/lib/db/cmContent";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, id))) {
    return NextResponse.json({ error: "No tenés acceso a esta cuenta." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const metric = (searchParams.get("topMetric") as ContentMetric | null) ?? "views";

  const [growth, history, content, topContent] = await Promise.all([
    getAccountGrowth(id),
    getAccountMetricsHistory(id),
    listContentForAccount(id),
    getTopContentByMetric([id], metric, 5),
  ]);
  return NextResponse.json({ growth, history, content, topContent });
}
