import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { getArtist } from "@/lib/db/artists";
import {
  listMeetingRequestsForArtist,
  createMeetingRequest,
  MEETING_REQUEST_PRIORITIES,
} from "@/lib/db/pmArtistWorkspace";

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, role: user.role }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }
  const requests = await listMeetingRequestsForArtist(artistId);
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, role: user.role }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const artist = await getArtist(artistId);
  if (!artist) return NextResponse.json({ error: "Artista no encontrado." }, { status: 404 });

  const body = await req.json();
  const { comment, priority, suggestedDate } = body as {
    comment?: string; priority?: string; suggestedDate?: string | null;
  };
  if (!comment?.trim()) {
    return NextResponse.json({ error: "Falta el comentario o temario de la reunión." }, { status: 400 });
  }
  const finalPriority = (MEETING_REQUEST_PRIORITIES as readonly string[]).includes(priority ?? "")
    ? (priority as string)
    : "Media";

  // artistName and requestedBy are always resolved server-side — never
  // trusted from the client body.
  const request = await createMeetingRequest({
    artistId,
    artistName: artist.name,
    requestedBy: user.email,
    comment: comment.trim(),
    priority: finalPriority,
    suggestedDate: suggestedDate || null,
  });
  return NextResponse.json({ request }, { status: 201 });
}
