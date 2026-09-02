import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getManagementReleaseEvents } from "@/lib/db/managementReleases";

// Mismo calendario de lanzamientos musicales que ya ven Management/Legal/
// Editorial (no filtrado por cuentas asignadas) — la CM necesita ver los
// próximos lanzamientos del sello aunque todavía no tenga ninguna cuenta
// asignada, para poder planificar contenido con anticipación.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const releases = await getManagementReleaseEvents();
  return NextResponse.json({ releases });
}
