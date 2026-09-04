import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getMeetingRequest, updateMeetingRequest, MEETING_MODALIDADES, MEETING_REQUEST_STATUSES } from "@/lib/db/pmArtistWorkspace";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const meeting = await getMeetingRequest(id);
  if (!meeting) return NextResponse.json({ error: "No encontramos esa reunión." }, { status: 404 });
  if (!hasPermission(user, "ver_management") && meeting.requestedBy !== user.email) {
    return NextResponse.json({ error: "No tenés acceso a esta reunión." }, { status: 403 });
  }
  return NextResponse.json({ meeting });
}

// Editar/reprogramar/cancelar desde el calendario — Management/admin sobre
// cualquier reunión (mismo alcance que ya tiene sobre pm_meeting_requests
// vía /api/management/meeting-requests/[id]).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const {
    status, scheduledDate, scheduledTime, managementNotes, participantes, modalidad, direccionOLink, comment,
  } = (body ?? {}) as {
    status?: string; scheduledDate?: string | null; scheduledTime?: string | null; managementNotes?: string | null;
    participantes?: string | null; modalidad?: string | null; direccionOLink?: string | null; comment?: string;
  };
  if (status && !(MEETING_REQUEST_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  if (modalidad && !(MEETING_MODALIDADES as readonly string[]).includes(modalidad)) {
    return NextResponse.json({ error: "Modalidad inválida." }, { status: 400 });
  }
  const meeting = await updateMeetingRequest(
    id,
    { status, scheduledDate, scheduledTime, managementNotes, participantes, modalidad, direccionOLink, comment },
    user.email
  );
  if (!meeting) return NextResponse.json({ error: "No encontramos esa reunión." }, { status: 404 });
  return NextResponse.json({ meeting });
}
