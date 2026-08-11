import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { listShows } from "@/lib/db/booking";

// Bridge route: Tour Manager needs to offer "pick an existing Booking show"
// without granting ver_booking. lib/db/booking.ts has no permission check of
// its own — only this route's own ver_tourmanager gate applies.
export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "ver_tourmanager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const shows = await listShows();
  return NextResponse.json({ shows });
}
