import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { createLaunch } from "@/lib/db/pmAnnualPlan";

export async function POST(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.roles?.length) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, roles: user.roles }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const body = await req.json();
  const { titulo, fechaObjetivo, objetivo, notas } = body as {
    titulo?: string; fechaObjetivo?: string; objetivo?: string | null; notas?: string | null;
  };
  if (!titulo?.trim() || !fechaObjetivo) {
    return NextResponse.json({ error: "Faltan el título o la fecha objetivo del lanzamiento." }, { status: 400 });
  }

  const launch = await createLaunch(artistId, { titulo: titulo.trim(), fechaObjetivo, objetivo, notas }, user.email);
  return NextResponse.json({ launch }, { status: 201 });
}
