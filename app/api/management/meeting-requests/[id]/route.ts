import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { updateMeetingRequest, deleteMeetingRequest, MEETING_REQUEST_STATUSES } from "@/lib/db/pmArtistWorkspace";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { status, scheduledDate, scheduledTime, managementNotes } = body as {
    status?: string; scheduledDate?: string | null; scheduledTime?: string | null; managementNotes?: string | null;
  };
  if (status !== undefined && !(MEETING_REQUEST_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const updated = await updateMeetingRequest(id, { status, scheduledDate, scheduledTime, managementNotes }, user.email);
  if (!updated) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ request: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await deleteMeetingRequest(id);
  return NextResponse.json({ ok: true });
}
