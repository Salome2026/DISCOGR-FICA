import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getOpportunity, canSeeOpportunity } from "@/lib/db/arOpportunities";
import { generateCatalogRevivalNarrative } from "@/lib/arCatalogRevival";
import { geminiConfigured } from "@/lib/gemini";
import { withTimeout } from "@/lib/withTimeout";

export const maxDuration = 90;

// Generic "generate/regenerate narrative" endpoint, dispatched by category —
// one route for every Gemini-narrated opportunity type instead of one route
// per category. Only OPORTUNIDAD DE CATÁLOGO has a real generator today;
// later fases (market snapshot, scouting, artist profiles) add their own
// branch here rather than a new top-level route.
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
    if (opportunity.category === "OPORTUNIDAD DE CATÁLOGO") {
      const catalogRevival = await withTimeout(generateCatalogRevivalNarrative(id), 60_000);
      if (!catalogRevival) {
        return NextResponse.json({ error: "Gemini no respondió a tiempo (60s) — probá de nuevo en un rato." }, { status: 504 });
      }
      return NextResponse.json({ catalogRevival });
    }
    return NextResponse.json(
      { error: `Todavía no hay generación de análisis con IA para la categoría "${opportunity.category}".` },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo generar el análisis." },
      { status: 500 }
    );
  }
}
