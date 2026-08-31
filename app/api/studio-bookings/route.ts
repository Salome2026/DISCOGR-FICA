import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { listBookingsForRange, createBooking, STUDIOS, SHIFTS } from "@/lib/db/pmStudioBookings";

function canReadCalendar(role: string | null): boolean {
  return role === "project_manager" || role === "management" || role === "admin";
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !canReadCalendar(user.role)) {
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
  if (!user?.email || !user.role) {
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

  if (user.role === "project_manager") {
    if (!(await canPmAccessArtist({ email: user.email, role: user.role }, artistId))) {
      return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
    }
  } else if (user.role === "management") {
    if (!hasPermission(user, "editar_management")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  } else if (user.role !== "admin") {
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
