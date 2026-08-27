import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listReleaseRequests } from "@/lib/db/legalReleaseRequests";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_legal")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") === "Enviado" ? "Enviado" : "Pendiente de envío";
  const q = searchParams.get("q") ?? undefined;
  const requests = await listReleaseRequests({ estado, q });
  return NextResponse.json({ requests });
}
