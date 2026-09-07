import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { findLiveDuplicates } from "@/lib/db/opDuplicados";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_op")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const groups = await findLiveDuplicates();
  return NextResponse.json({ groups });
}
