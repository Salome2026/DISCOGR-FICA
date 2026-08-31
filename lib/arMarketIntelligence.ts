import { sql } from "@vercel/postgres";
import { getRankingLatest } from "@/lib/db/listeners";
import { listGenreTrendSignals } from "@/lib/db/arGenreTrends";
import { createMarketSnapshot } from "@/lib/db/arMarketSnapshots";
import type { ArMarketSnapshot, ArMarketNarrative } from "@discografica/shared/types/ar";

// Full "flash" (thinking-capable) — cross-referencing several independent
// signal sources into one coherent read of the market is genuine judgment,
// not bounded extraction, same tier as lib/arCatalogRevival.ts.
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-flash-latest";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    resumenGeneral: { type: "STRING" },
    hallazgosClave: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titulo: { type: "STRING" },
          detalle: { type: "STRING" },
          tipo: { type: "STRING" },
          relevanciaParaElSello: { type: "STRING" },
        },
        required: ["titulo", "detalle", "tipo", "relevanciaParaElSello"],
      },
    },
    generosEnCrecimientoAR: { type: "ARRAY", items: { type: "STRING" } },
    artistasRosterDestacados: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { nombre: { type: "STRING" }, motivo: { type: "STRING" } },
        required: ["nombre", "motivo"],
      },
    },
    oportunidadesParaRevisar: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { opportunityId: { type: "STRING" }, motivo: { type: "STRING" } },
        required: ["opportunityId", "motivo"],
      },
    },
  },
  required: ["resumenGeneral", "hallazgosClave", "generosEnCrecimientoAR", "artistasRosterDestacados", "oportunidadesParaRevisar"],
};

type RosterGrowthRow = { artistName: string; sello: string | null; growthPct: number; current: number; previous: number };
type OpportunityRow = { id: string; title: string; subjectName: string; category?: string; score?: number | null };
type PlaylistMomentumRow = { genre: string; addsLast30d: number };

async function gatherDataSnapshot() {
  const ranking = await getRankingLatest();
  const growth: RosterGrowthRow[] = [];
  for (const r of ranking) {
    if (r.sello === "Remix") continue;
    if (r.monthly_listeners == null || r.prev_7d == null || r.prev_7d <= 0) continue;
    const pct = (r.monthly_listeners - r.prev_7d) / r.prev_7d;
    growth.push({ artistName: r.artist_name, sello: r.sello, growthPct: pct, current: r.monthly_listeners, previous: r.prev_7d });
  }
  growth.sort((a, b) => b.growthPct - a.growthPct);
  const topGainers = growth.slice(0, 8);
  const topDecliners = growth.filter((g) => g.growthPct < 0).slice(-5).reverse();

  const { rows: catalogRows } = await sql`
    SELECT id, title, subject_name FROM ar_opportunities
    WHERE category = 'OPORTUNIDAD DE CATÁLOGO' AND archived = false
    ORDER BY created_at DESC LIMIT 10
  `;
  const catalogOpportunities = catalogRows.map((r) => ({ id: r.id as string, title: r.title as string, subjectName: r.subject_name as string }));

  const { rows: manualRows } = await sql`
    SELECT id, title, subject_name, category, source_type FROM ar_opportunities
    WHERE source_type LIKE 'manual_%' AND created_at >= now() - interval '7 days'
    ORDER BY created_at DESC LIMIT 15
  `;
  const manualEntries = manualRows.map((r) => ({ id: r.id as string, title: r.title as string, subjectName: r.subject_name as string, category: r.category as string }));

  const { rows: momentumRows } = await sql`
    SELECT sp.genre, count(*) AS adds FROM spotify_playlist_tracks spt
    JOIN spotify_playlists sp ON sp.id = spt.playlist_id
    WHERE spt.added_at >= now() - interval '30 days' AND spt.removed_at IS NULL AND sp.genre IS NOT NULL
    GROUP BY sp.genre ORDER BY adds DESC LIMIT 10
  `;
  const playlistMomentum: PlaylistMomentumRow[] = momentumRows.map((r) => ({ genre: r.genre as string, addsLast30d: Number(r.adds) }));

  const activeTrends = await listGenreTrendSignals({ activeOnly: true });

  return { topGainers, topDecliners, catalogOpportunities, manualEntries, playlistMomentum, activeTrends };
}

function buildPrompt(data: Awaited<ReturnType<typeof gatherDataSnapshot>>): string {
  const { topGainers, topDecliners, catalogOpportunities, manualEntries, playlistMomentum, activeTrends } = data;

  const gainersStr = topGainers.length
    ? topGainers.map((g) => `- ${g.artistName} (${g.sello ?? "s/d"}): ${(g.growthPct * 100).toFixed(1)}% esta semana (${g.previous} → ${g.current} oyentes mensuales)`).join("\n")
    : "Sin datos de crecimiento de Spotify esta semana (sin sincronización reciente de Chartmetric) — no inventes cifras, decilo explícitamente.";

  const declinersStr = topDecliners.length
    ? topDecliners.map((g) => `- ${g.artistName} (${g.sello ?? "s/d"}): ${(g.growthPct * 100).toFixed(1)}% esta semana`).join("\n")
    : "Sin caídas notables detectadas (o sin datos).";

  const catalogStr = catalogOpportunities.length
    ? catalogOpportunities.map((o) => `- id="${o.id}": "${o.title}"`).join("\n")
    : "Ninguna oportunidad de revival de catálogo activa todavía.";

  const manualStr = manualEntries.length
    ? manualEntries.map((o) => `- id="${o.id}" [${o.category}]: "${o.title}" (sujeto: ${o.subjectName})`).join("\n")
    : "Sin hallazgos manuales cargados en los últimos 7 días.";

  const momentumStr = playlistMomentum.length
    ? playlistMomentum.map((m) => `- ${m.genre}: ${m.addsLast30d} canciones agregadas a nuestras playlists en 30 días`).join("\n")
    : "Sin movimiento reciente registrado en las playlists propias.";

  const trendsStr = activeTrends.length
    ? activeTrends.map((t) => `- ${t.genre}: ${t.trendDirection} (fuente: ${t.sourceType}${t.note ? `, nota: ${t.note}` : ""})`).join("\n")
    : "Sin tendencias de género reportadas todavía.";

  const allOpportunityIds = [...catalogOpportunities.map((o) => o.id), ...manualEntries.map((o) => o.id)];
  const allArtistNames = [...new Set([...topGainers.map((g) => g.artistName), ...topDecliners.map((g) => g.artistName)])];

  return `Sos el Director de A&R de un sello discográfico argentino (MAWZ Records, Indyana Records, Caserio Records y otros sellos chicos). Tenés que dar un resumen ejecutivo de lo que está pasando ahora mismo, cruzando señales internas (crecimiento del roster propio, catálogo, playlists) y externas (tendencias de género reportadas manualmente, ya que no hay API gratuita de TikTok/Instagram).

CRECIMIENTO DEL ROSTER PROPIO ESTA SEMANA (Spotify, vía Chartmetric)
${gainersStr}

ARTISTAS PROPIOS QUE PERDIERON TRACCIÓN
${declinersStr}

OPORTUNIDADES DE REVIVAL DE CATÁLOGO ACTIVAS (lista cerrada de ids reales — para "oportunidadesParaRevisar" SOLO podés usar estos ids exactos)
${catalogStr}

HALLAZGOS MANUALES CARGADOS ESTA SEMANA (TikTok, Instagram, otras fuentes sin API — lista cerrada de ids reales)
${manualStr}

MOMENTUM DE NUESTRAS PROPIAS PLAYLISTS POR GÉNERO (canciones agregadas en los últimos 30 días — señal real de qué géneros estamos curando más activamente)
${momentumStr}

TENDENCIAS DE GÉNERO REPORTADAS (activas)
${trendsStr}

INSTRUCCIONES
- "resumenGeneral": 3-4 líneas, tono de reporte ejecutivo directo, qué es lo más importante de esta semana.
- "hallazgosClave": 3-6 hallazgos concretos, cada uno con detalle real (cita números cuando los tengas) y por qué le importa al sello.
- "generosEnCrecimientoAR": géneros que muestran señales reales de crecimiento (de las tendencias reportadas o del momentum de playlists) — si no hay evidencia real de ningún género creciendo, dejalo vacío, no inventes.
- "artistasRosterDestacados": SOLO de esta lista cerrada de nombres reales: ${allArtistNames.length ? allArtistNames.join(", ") : "(ninguno con datos esta semana)"}. Si la lista está vacía, dejá el array vacío.
- "oportunidadesParaRevisar": SOLO ids de esta lista cerrada: ${allOpportunityIds.length ? allOpportunityIds.join(", ") : "(ninguna)"}. Elegí las 3-5 más urgentes/interesantes con un motivo concreto. Si la lista está vacía, dejá el array vacío.
- Si una sección no tiene datos reales para trabajar, decilo explícitamente en el texto en vez de inventar contenido — por ejemplo "no hay datos de crecimiento esta semana por una interrupción de la sincronización con Chartmetric" es una respuesta válida y preferible a inventar un número.
- Nunca inventes un nombre de artista ni un id de oportunidad que no esté en las listas cerradas de arriba.
- Escribí todo en español rioplatense, tono profesional y directo, con tildes y ñ correctos.
- Respondé únicamente con el JSON solicitado.`;
}

export async function generateMarketSnapshot(generatedBy: string | null = null): Promise<ArMarketSnapshot> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const data = await gatherDataSnapshot();

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(data) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }
  const responseData = await res.json();
  const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido.");

  const narrative = JSON.parse(text) as ArMarketNarrative;
  return createMarketSnapshot({
    scope: "combined",
    narrative,
    dataSnapshot: data as unknown as Record<string, unknown>,
    generatedBy,
    model: MODEL,
  });
}
