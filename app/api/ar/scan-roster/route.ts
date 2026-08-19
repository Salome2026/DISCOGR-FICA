import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { scanLabelRosterGrowth } from "@/lib/arSignalScan";

// Manual trigger for now — Etapa 2b wires this same function into a cron
// route instead of adding a second scan path, this one stays as the
// on-demand "run it now" button.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await scanLabelRosterGrowth();
  return NextResponse.json(result);
}
