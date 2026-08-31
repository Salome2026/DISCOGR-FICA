import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { addNote } from "@/lib/db/pmArtistWorkspace";

export async function POST(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, role: user.role }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const body = await req.json();
  const noteBody = (body as { body?: string }).body?.trim();
  if (!noteBody) return NextResponse.json({ error: "La nota no puede estar vacía." }, { status: 400 });

  const note = await addNote(artistId, user.email, noteBody);
  return NextResponse.json({ note });
}
