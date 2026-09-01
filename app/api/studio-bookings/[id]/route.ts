import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import type { SessionUser } from "@/lib/permissions";
import { getBooking, updateBooking, cancelBooking, STUDIOS, SHIFTS } from "@/lib/db/pmStudioBookings";

// Temporary: any authenticated PM/management/admin can manage any booking —
// see the matching note in app/api/studio-bookings/route.ts. Revert to an
// ownership check (canPmAccessArtist) here once every PM has real
// assignments.
function canManageBooking(user: SessionUser): boolean {
  return user.roles.some((r) => ["project_manager", "management", "admin"].includes(r));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const current = await getBooking(id);
  if (!current) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  const body = await req.json();
  const { artistId, artistName, studio, bookingDate, shift, comment } = body as {
    artistId?: string; artistName?: string; studio?: string; bookingDate?: string; shift?: string; comment?: string | null;
  };
  if (studio !== undefined && !(STUDIOS as readonly string[]).includes(studio)) {
    return NextResponse.json({ error: "Estudio inválido." }, { status: 400 });
  }
  if (shift !== undefined && !(SHIFTS as readonly string[]).includes(shift)) {
    return NextResponse.json({ error: "Turno inválido." }, { status: 400 });
  }
  if (!canManageBooking(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const updated = await updateBooking(id, { artistId, artistName, studio, bookingDate, shift, comment }, user.email);
  if (!updated) {
    return NextResponse.json({ error: "Ese turno ya está reservado." }, { status: 409 });
  }
  return NextResponse.json({ booking: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const current = await getBooking(id);
  if (!current) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  if (!canManageBooking(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = (body as { reason?: string }).reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: "Hay que indicar el motivo para cancelar la reserva." }, { status: 400 });
  }

  await cancelBooking(id, reason, user.email);
  return NextResponse.json({ ok: true });
}
