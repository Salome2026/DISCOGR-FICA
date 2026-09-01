import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canPmAccessArtist, canViewAnnualPlan } from "@/lib/db/pmArtistAssignments";
import { getAnnualPlan, upsertAnnualPlanHeader, listLaunches, listActions, listQuarterlyReviews } from "@/lib/db/pmAnnualPlan";

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canViewAnnualPlan(user, artistId))) {
    return NextResponse.json({ error: "No tenés acceso a este artista." }, { status: 403 });
  }

  const [plan, launches, actions, quarterlyReviews] = await Promise.all([
    getAnnualPlan(artistId),
    listLaunches(artistId),
    listActions(artistId),
    listQuarterlyReviews(artistId),
  ]);
  return NextResponse.json({ plan, launches, actions, quarterlyReviews });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !user.role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { artistId } = await params;
  if (!(await canPmAccessArtist({ email: user.email, role: user.role }, artistId))) {
    return NextResponse.json({ error: "No tenés este artista asignado." }, { status: 403 });
  }

  const body = await req.json();
  const {
    periodStart, periodEnd, objetivoGeneral, objetivosEspecificos, cantidadLanzamientosProyectados,
    metasYResultados, presupuestoEstimado, resumenEjecutivo, observacionesPm,
  } = body as {
    periodStart?: string | null; periodEnd?: string | null; objetivoGeneral?: string | null;
    objetivosEspecificos?: string[]; cantidadLanzamientosProyectados?: number | null;
    metasYResultados?: string | null; presupuestoEstimado?: number | null; resumenEjecutivo?: string | null;
    observacionesPm?: string | null;
  };

  const plan = await upsertAnnualPlanHeader(
    artistId,
    { periodStart, periodEnd, objetivoGeneral, objetivosEspecificos, cantidadLanzamientosProyectados, metasYResultados, presupuestoEstimado, resumenEjecutivo, observacionesPm },
    user.email
  );
  return NextResponse.json({ plan });
}
