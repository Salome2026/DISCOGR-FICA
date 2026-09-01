import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listBookingsForRange, createBooking, STUDIOS, SHIFTS } from "@/lib/db/pmStudioBookings";

function canReadCalendar(roles: string[]): boolean {
  return ["project_manager", "management", "admin"].some((r) => roles.includes(r));
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !canReadCalendar(user.roles)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Faltan start/end." }, { status: 400 });
  }
  const bookings = await listBookingsForRange(start, end);
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { artistId, artistName, studio, bookingDate, shift, comment } = body as {
    artistId?: string; artistName?: string; studio?: string; bookingDate?: string; shift?: string; comment?: string | null;
  };
  if (!artistId || !artistName || !studio || !bookingDate || !shift) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (!(STUDIOS as readonly string[]).includes(studio)) {
    return NextResponse.json({ error: "Estudio inválido." }, { status: 400 });
  }
  if (!(SHIFTS as readonly string[]).includes(shift)) {
    return NextResponse.json({ error: "Turno inválido." }, { status: 400 });
  }

  // Temporary: any authenticated PM/management/admin can book for any
  // artist — while PM↔artist assignments aren't fully populated for every
  // active PM yet, gating this by canPmAccessArtist would block real people
  // from scheduling real sessions. Revert to the ownership check here once
  // every PM has real assignments (mirrors the same rollout caution as the
  // release-creation restriction in app/api/pm/releases/route.ts).
  if (!user.roles.some((r) => ["project_manager", "management", "admin"].includes(r))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const booking = await createBooking(
    { artistId, artistName, studio, bookingDate, shift, comment: comment || null },
    user.email
  );
  if (!booking) {
    return NextResponse.json({ error: "Ese turno ya está reservado." }, { status: 409 });
  }
  return NextResponse.json({ booking }, { status: 201 });
}
