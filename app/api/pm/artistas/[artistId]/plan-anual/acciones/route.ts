import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist } from "@/lib/db/pmArtistAssignments";
import { createAction, ANNUAL_PLAN_ACTION_TYPES } from "@/lib/db/pmAnnualPlan";

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
  const { launchId, actionType, customLabel, descripcion, responsable, fechaLimite } = body as {
    launchId?: number | null; actionType?: string; customLabel?: string | null;
    descripcion?: string | null; responsable?: string | null; fechaLimite?: string | null;
  };
  if (!actionType || !(ANNUAL_PLAN_ACTION_TYPES as readonly { slug: string }[]).some((t) => t.slug === actionType)) {
    return NextResponse.json({ error: "Tipo de acción inválido." }, { status: 400 });
  }

  const action = await createAction(
    artistId,
    { launchId: launchId ?? null, actionType, customLabel, descripcion, responsable, fechaLimite },
    user.email
  );
  return NextResponse.json({ action }, { status: 201 });
}
