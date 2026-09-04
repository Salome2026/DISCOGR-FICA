import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listMeetingsInRange, listMeetingsInRangeForPm, createManagementMeeting, MEETING_MODALIDADES } from "@/lib/db/pmArtistWorkspace";
import { getArtist } from "@/lib/db/artists";

// Ver el calendario: Management/admin ven todas las reuniones de la semana;
// un PM ve solo las suyas (mismo criterio de "para las que tengan
// autorización" que el resto de la plataforma) — nunca mezclado con
// lanzamientos/shows/estudios, esta tabla es únicamente reuniones de
// Management.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Faltan start/end." }, { status: 400 });
  }
  const canSeeAll = hasPermission(user, "ver_management");
  const meetings = canSeeAll
    ? await listMeetingsInRange(start, end)
    : user.roles.includes("project_manager")
      ? await listMeetingsInRangeForPm(start, end, user.email)
      : [];
  return NextResponse.json({ meetings });
}

// Alta directa (Management crea la reunión ya con fecha/hora, sin pasar por
// el pedido previo de un PM) — gateado por editar_management, como el resto
// de las acciones de escritura de ese módulo.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const {
    artistId, artistName: bodyArtistName, pmEmail, comment, scheduledDate, scheduledTime,
    participantes, modalidad, direccionOLink,
  } = (body ?? {}) as {
    artistId?: string; artistName?: string; pmEmail?: string; comment?: string;
    scheduledDate?: string; scheduledTime?: string | null;
    participantes?: string | null; modalidad?: string | null; direccionOLink?: string | null;
  };

  if (!artistId || !pmEmail || !comment?.trim() || !scheduledDate) {
    return NextResponse.json({ error: "Faltan datos obligatorios (artista, PM, temario, fecha)." }, { status: 400 });
  }
  if (modalidad && !(MEETING_MODALIDADES as readonly string[]).includes(modalidad)) {
    return NextResponse.json({ error: "Modalidad inválida." }, { status: 400 });
  }

  const artist = await getArtist(artistId);
  const artistName = artist?.name ?? bodyArtistName;
  if (!artistName) {
    return NextResponse.json({ error: "No encontramos el artista." }, { status: 400 });
  }

  const meeting = await createManagementMeeting({
    artistId,
    artistName,
    pmEmail,
    comment: comment.trim(),
    scheduledDate,
    scheduledTime: scheduledTime || null,
    participantes: participantes?.trim() || null,
    modalidad: modalidad || null,
    direccionOLink: direccionOLink?.trim() || null,
    actorEmail: user.email,
  });
  return NextResponse.json({ meeting });
}
