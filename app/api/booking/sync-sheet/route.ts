import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { syncAgendaFromSheet } from "@/lib/bookingSheetSync";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_booking")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await syncAgendaFromSheet();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
