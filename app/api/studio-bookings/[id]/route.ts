import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { getBooking, updateBooking, cancelBooking, STUDIOS, SHIFTS } from "@/lib/db/pmStudioBookings";

// Management/admin: unrestricted. project_manager: must own the booking's
// current artist, and — if reassigning to a different artist — must also
// own the new one.
async function canManageBooking(
  user: SessionUser,
  currentArtistId: string,
  nextArtistId?: string
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role === "management") return hasPermission(user, "editar_management");
  if (user.role !== "project_manager" || !user.email) return false;
  const ownsCurrent = await canPmAccessArtist({ email: user.email, role: user.role }, currentArtistId);
  if (!ownsCurrent) return false;
  if (nextArtistId && nextArtistId !== currentArtistId) {
    return canPmAccessArtist({ email: user.email, role: user.role }, nextArtistId);
  }
  return true;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
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
  if (!(await canManageBooking(user, current.artistId, artistId))) {
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
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const current = await getBooking(id);
  if (!current) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  if (!(await canManageBooking(user, current.artistId))) {
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
