import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listLaunchesForCm, listLaunchesWithoutCm, listAllLaunches } from "@/lib/db/cmLaunches";

// Bandeja de novedades — una CM ve sus propios lanzamientos (según las
// cuentas que tiene asignadas); Management/admin ven todos.
// ?sinAsignar=1 (solo Management/admin) devuelve la bandeja separada de
// "Lanzamientos sin CM asignada".
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  if (searchParams.get("sinAsignar") === "1") {
    if (!hasPermission(user, "editar_management")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const launches = await listLaunchesWithoutCm();
    return NextResponse.json({ launches });
  }
  const launches = user.roles.includes("admin") || user.roles.includes("management")
    ? await listAllLaunches()
    : await listLaunchesForCm(user.email);
  return NextResponse.json({ launches });
}
