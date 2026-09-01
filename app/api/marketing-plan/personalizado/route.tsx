import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getArtistCatalogHistory } from "@/lib/db/catalog";
import { chartmetricConfigured, searchArtist, getArtistSpotifyStats } from "@/lib/chartmetric";
import { geminiConfigured, generateMarketingPlan, getContentExamples, buildCalendarDates, type MarketingPlanInput } from "@/lib/gemini";
import PlanPersonalizadoDoc from "@/lib/pdf/PlanPersonalizadoDoc";
import { withTimeout } from "@/lib/withTimeout";

async function chartmetricSnapshot(name: string, knownChartmetricId?: number | null) {
  if (!chartmetricConfigured()) return null;
  let chartmetricId = knownChartmetricId ?? null;
  if (!chartmetricId) {
    const match = await withTimeout(searchArtist(name), 4000);
    if (!match) return null;
    chartmetricId = match.chartmetricId;
  }
  const stats = await withTimeout(getArtistSpotifyStats(chartmetricId), 4000);
  if (!stats) return null;
  return {
    monthlyListeners: stats.monthlyListeners,
    rank: stats.artistRank,
    topCities: stats.topCities.map((c) => ({ name: c.name, countryCode: c.countryCode })),
    homeCountry: stats.homeCountry,
  };
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-z0-9\-_. ]/gi, "").trim() || "plan";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  if (!session?.user?.email || roles.length === 0) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!geminiConfigured()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY no está configurado todavía." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const {
    artist, featuring, sello, tipo, fonograma, fecha, genero, socialLink, presupuesto, chartmetricId,
  } = body as {
    artist?: string; featuring?: string; sello?: string | null; tipo?: string;
    fonograma?: string; fecha?: string | null; genero?: string; socialLink?: string;
    presupuesto?: { tiene: boolean; montoArs?: number }; chartmetricId?: number | null;
  };

  if (!artist || !fonograma || !genero || !socialLink || !presupuesto) {
    return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
  }
  if (genero.trim().length < 2 || genero.trim().length > 60) {
    return NextResponse.json({ error: "Género inválido." }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(socialLink.trim())) {
    return NextResponse.json({ error: "El link de red social no es válido." }, { status: 400 });
  }

  const featuringNames = (featuring || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  const primaryFeaturing = featuringNames[0] ?? null;

  const [historialArtista, historialFeaturingRaw, cmArtist, cmFeaturing] = await Promise.all([
    getArtistCatalogHistory(artist).catch(() => []),
    primaryFeaturing ? getArtistCatalogHistory(primaryFeaturing).catch(() => []) : Promise.resolve([]),
    chartmetricSnapshot(artist, chartmetricId),
    primaryFeaturing ? chartmetricSnapshot(primaryFeaturing) : Promise.resolve(null),
  ]);

  const input: MarketingPlanInput = {
    artist,
    featuring: featuringNames,
    sello: sello || null,
    tipo: tipo || "single",
    fonograma,
    fecha: fecha || null,
    genero,
    socialLink: socialLink.trim(),
    presupuesto: presupuesto.tiene && presupuesto.montoArs ? { tiene: true, montoArs: presupuesto.montoArs } : { tiene: false },
    historialArtista: historialArtista.map((t) => ({ titulo: t.track, fecha: t.release_date, sello: t.company })),
    historialFeaturing: historialFeaturingRaw.map((t) => ({ nombre: primaryFeaturing!, titulo: t.track, fecha: t.release_date })),
    chartmetric: {
      artist: cmArtist,
      featuring: cmFeaturing && primaryFeaturing ? { nombre: primaryFeaturing, ...cmFeaturing } : null,
    },
    contentExamples: getContentExamples(genero),
    calendario: buildCalendarDates(fecha || null),
  };

  try {
    const plan = await generateMarketingPlan(input);
    const buffer = await renderToBuffer(<PlanPersonalizadoDoc input={input} plan={plan} />);
    const filename = `Plan-Marketing-${sanitizeFilename(artist)}-${sanitizeFilename(fonograma)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Error generando plan personalizado:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo generar el plan." },
      { status: 500 }
    );
  }
}
