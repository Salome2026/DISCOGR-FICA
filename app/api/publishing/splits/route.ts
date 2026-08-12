import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listSplits } from "@/lib/db/editorialSplits";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_publishing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const estado = req.nextUrl.searchParams.get("estado") === "Enviado" ? "Enviado" : "Pendiente";
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const splits = await listSplits({ estado, q });
  return NextResponse.json({ splits });
}
