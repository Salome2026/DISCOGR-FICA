import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listUsersByRole } from "@/lib/db/users";

// Narrow PM picker for "Asignar a PM" — not the full user directory.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const pms = await listUsersByRole("project_manager");
  return NextResponse.json({ pms: pms.map((p) => ({ email: p.email, name: p.name })) });
}
