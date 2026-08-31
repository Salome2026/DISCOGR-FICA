import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { scanCatalogRevivalOpportunities } from "@/lib/arCatalogRevival";

// Manual trigger for now, same pattern as /api/ar/scan-roster — the Fase 3
// cron wires this same function in alongside the other scans instead of
// adding a second scan path.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await scanCatalogRevivalOpportunities();
  return NextResponse.json(result);
}
