import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getBookingHistory } from "@/lib/db/pmStudioBookings";

function canReadCalendar(role: string | null): boolean {
  return role === "project_manager" || role === "management" || role === "admin";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !canReadCalendar(user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const history = await getBookingHistory(id);
  return NextResponse.json({ history });
}
