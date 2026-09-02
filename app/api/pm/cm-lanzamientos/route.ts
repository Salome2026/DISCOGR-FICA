import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listLaunchesForPm } from "@/lib/db/cmLaunches";

// El PM ve sus propios lanzamientos (con el estado de materiales y si hay
// comentarios de Community Manager) sin salir de su propio panel.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.includes("project_manager") && !user.roles?.includes("admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const launches = await listLaunchesForPm(user.email);
  return NextResponse.json({ launches });
}
