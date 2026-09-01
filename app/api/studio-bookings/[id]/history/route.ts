import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getBookingHistory } from "@/lib/db/pmStudioBookings";

function canReadCalendar(roles: string[]): boolean {
  return ["project_manager", "management", "admin"].some((r) => roles.includes(r));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !canReadCalendar(user.roles)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const history = await getBookingHistory(id);
  return NextResponse.json({ history });
}
