import { NextRequest, NextResponse } from "next/server";
import { getUserByToken } from "@/lib/db/calendarFeedTokens";
import { getUserByEmail } from "@/lib/db/users";
import { hasPermission } from "@/lib/permissions";
import { listMeetingsInRange, listMeetingsInRangeForPm } from "@/lib/db/pmArtistWorkspace";
import { buildIcsCalendar, buildMeetingVEvent } from "@/lib/ics";

const FEED_SCOPE = "management_meetings";

// Feed .ics para suscripción externa (Apple Calendar u otro cliente webcal) —
// SIN sesión de por medio, a propósito: es la app de calendario del sistema
// operativo la que pega acá periódicamente, nunca un browser logueado. El
// token opaco ES la autenticación (ver lib/db/calendarFeedTokens.ts) — jamás
// se pide ni se acepta email/contraseña/credencial de iCloud en esta ruta.
// Rango amplio y fijo (no ?start=/&end=, esto no lo controla un humano en
// vivo): pasado reciente + futuro lejano, para que Apple Calendar vaya
// mostrando lo que corresponda a medida que uno navega el calendario.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Falta el token." }, { status: 400 });
  }
  const userEmail = await getUserByToken(token, FEED_SCOPE);
  if (!userEmail) {
    return NextResponse.json({ error: "Token inválido o revocado." }, { status: 401 });
  }
  const user = await getUserByEmail(userEmail);
  if (!user || !user.roles?.length) {
    return NextResponse.json({ error: "Token inválido o revocado." }, { status: 401 });
  }

  const now = new Date();
  const start = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const meetings = hasPermission(user, "ver_management")
    ? await listMeetingsInRange(start, end)
    : user.roles.includes("project_manager")
      ? await listMeetingsInRangeForPm(start, end, user.email)
      : [];

  const vevents = meetings
    .map((m) =>
      buildMeetingVEvent({
        id: m.id,
        artistName: m.artistName,
        pmEmail: m.requestedBy,
        comment: m.comment,
        status: m.status as "Pendiente" | "Agendada" | "Realizada" | "Cancelada",
        scheduledDate: m.scheduledDate,
        scheduledTime: m.scheduledTime,
        suggestedDate: m.suggestedDate,
        participantes: m.participantes,
        modalidad: m.modalidad,
        direccionOLink: m.direccionOLink,
        updatedAt: m.updatedAt,
        createdAt: m.createdAt,
      })
    )
    .filter(Boolean);

  const ics = buildIcsCalendar(vevents, "Reuniones de Management");
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="reuniones-management.ics"',
      "Cache-Control": "no-store",
    },
  });
}
