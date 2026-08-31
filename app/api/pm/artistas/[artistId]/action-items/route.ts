import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { addActionItem } from "@/lib/db/pmArtistWorkspace";

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
  const title = (body as { title?: string }).title?.trim();
  if (!title) return NextResponse.json({ error: "Falta el título de la acción." }, { status: 400 });

  const item = await addActionItem(artistId, title, user.email);
  return NextResponse.json({ item });
}
