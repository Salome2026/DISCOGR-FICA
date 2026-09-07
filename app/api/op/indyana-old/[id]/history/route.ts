import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getOpIndyanaOldHistory } from "@/lib/db/opIndyanaOld";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const history = await getOpIndyanaOldHistory(id);
  return NextResponse.json({ history });
}
