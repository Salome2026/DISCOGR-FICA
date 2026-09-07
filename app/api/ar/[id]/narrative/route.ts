import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getOpportunity, canSeeOpportunity } from "@/lib/db/arOpportunities";
import { generateCatalogRevivalNarrative } from "@/lib/arCatalogRevival";
import { generateScoutingAssessment } from "@/lib/arScouting";
import { geminiConfigured } from "@/lib/gemini";
import { raceTimeout, TimeoutError } from "@/lib/withTimeout";

export const maxDuration = 90;

// Generic "generate/regenerate narrative" endpoint, dispatched by subject
// type / category — one route for every Gemini-narrated opportunity type
// instead of one route per type. subjectType se chequea antes que category:
// subjectType describe el hecho real del sujeto (nunca lo edita a mano
// nadie salvo al cargar el hallazgo), mientras que category es más una
// etiqueta de flujo — si alguien cargó un hallazgo con
// category="OPORTUNIDAD DE CATÁLOGO" pero subjectType="artist_external"
// (posible desde /panel/ar/nuevo, son selects independientes), el sujeto
// real manda: es un candidato externo, no un track de catálogo.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!geminiConfigured()) {
    return NextResponse.json({ error: "GEMINI_API_KEY no está configurado todavía." }, { status: 400 });
  }
  const { id } = await params;
  if (!(await canSeeOpportunity(user, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const opportunity = await getOpportunity(id);
  if (!opportunity) {
    return NextResponse.json({ error: "Oportunidad no encontrada." }, { status: 404 });
  }

  try {
    if (opportunity.subjectType === "artist_external") {
      const scoutingAssessment = await raceTimeout(generateScoutingAssessment(id), 60_000);
      return NextResponse.json({ scoutingAssessment });
    }
    if (opportunity.category === "OPORTUNIDAD DE CATÁLOGO") {
      const catalogRevival = await raceTimeout(generateCatalogRevivalNarrative(id), 60_000);
      return NextResponse.json({ catalogRevival });
    }
    return NextResponse.json(
      { error: `Todavía no hay generación de análisis con IA para la categoría "${opportunity.category}".` },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof TimeoutError) {
      return NextResponse.json({ error: "Gemini no respondió a tiempo (60s) — probá de nuevo en un rato." }, { status: 504 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo generar el análisis." },
      { status: 500 }
    );
  }
}
