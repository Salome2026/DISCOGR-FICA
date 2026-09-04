import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getMeetingRequest } from "@/lib/db/pmArtistWorkspace";
import { buildIcsCalendar, buildMeetingVEvent } from "@/lib/ics";

// "Agregar a Apple Calendar" de UNA reunión puntual — mismo UID que usaría
// esa misma reunión dentro del feed completo, así que si la persona ya está
// suscripta al feed, este archivo no crea un evento duplicado: el cliente
// de calendario lo reconoce como el mismo evento por UID.
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

  const vevent = buildMeetingVEvent({
    id: meeting.id,
    artistName: meeting.artistName,
    pmEmail: meeting.requestedBy,
    comment: meeting.comment,
    status: meeting.status as "Pendiente" | "Agendada" | "Realizada" | "Cancelada",
    scheduledDate: meeting.scheduledDate,
    scheduledTime: meeting.scheduledTime,
    suggestedDate: meeting.suggestedDate,
    participantes: meeting.participantes,
    modalidad: meeting.modalidad,
    direccionOLink: meeting.direccionOLink,
    updatedAt: meeting.updatedAt,
    createdAt: meeting.createdAt,
  });
  if (!vevent) {
    return NextResponse.json({ error: "Esta reunión todavía no tiene fecha." }, { status: 400 });
  }
  const ics = buildIcsCalendar([vevent], `Reunión — ${meeting.artistName}`);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reunion-${meeting.id}.ics"`,
    },
  });
}
