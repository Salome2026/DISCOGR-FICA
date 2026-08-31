import { sql } from "@vercel/postgres";
import type { CatalogTrack } from "@/lib/db/catalog";
import { getTrack } from "@/lib/db/catalog";
import { listActiveGrowingGenreTrends, type ArGenreTrendSignal } from "@/lib/db/arGenreTrends";
import { findCompatibleRosterArtistsForGenre } from "@/lib/arCompatibility";
import { computeScore } from "@/lib/arScoring";
import { upsertAutoOpportunity, findOpenOpportunityBySubject, getOpportunity, setOpportunityNarrative } from "@/lib/db/arOpportunities";
import type { ArCatalogRevivalNarrative } from "@discografica/shared/types/ar";

// Real catalog tracks in this genre that are actually ours (excludes
// "Remix"/"Streamings" — those aren't signed-roster catalog for revival
// purposes, same exclusion as lib/roster.ts's excludeSellos). Direct genre
// match first, falls back to the label's own genre-tagged Spotify playlists
// for tracks that never got a genero value at load time — same fallback
// findCompatibleRosterArtistsForGenre() uses, kept consistent on purpose.
async function findOwnTracksInGenre(genre: string): Promise<CatalogTrack[]> {
  const { rows } = await sql`
    SELECT DISTINCT ct.* FROM catalog_tracks ct
    LEFT JOIN spotify_playlist_tracks spt ON spt.catalog_track_id = ct.id AND spt.removed_at IS NULL
    LEFT JOIN spotify_playlists sp ON sp.id = spt.playlist_id
    WHERE ct.sello IS NOT NULL AND ct.sello NOT IN ('Remix', 'Streamings')
      AND (ct.genero ILIKE ${genre} OR (ct.genero IS NULL AND sp.genre ILIKE ${genre}))
  `;
  return rows as CatalogTrack[];
}

// For each genre currently reported as "growing" (ar_genre_trend_signals),
// finds our own catalog tracks in that genre and surfaces each as an
// OPORTUNIDAD DE CATÁLOGO — one opportunity per track, subjectKey is the
// catalog_tracks.id so re-scans update in place instead of duplicating.
// growth stays null (honestly excluded, never fabricated) since a catalog
// track relaunch has no real "week over week" metric of its own yet.
export async function scanCatalogRevivalOpportunities(): Promise<{ scanned: number; created: number; updated: number }> {
  const trends = await listActiveGrowingGenreTrends();
  let scanned = 0;
  let created = 0;
  let updated = 0;

  for (const trend of trends) {
    const tracks = await findOwnTracksInGenre(trend.genre);
    for (const track of tracks) {
      scanned++;
      const matchedArtists = await findCompatibleRosterArtistsForGenre(trend.genre, track.artist_display);
      const compatibility = {
        matchedArtists,
        suggestedAction: matchedArtists.length > 0 ? "Evaluar reactivación de catálogo" : null,
        suggestedSello: track.sello,
      };
      const { score, breakdown, version } = computeScore({
        currentMetric: null,
        previousMetric: null,
        sourceCount: 1,
        compatibility,
        createdAt: new Date().toISOString(),
      });

      const existingBefore = await findOpenOpportunityBySubject("track_label", track.id);
      await upsertAutoOpportunity({
        category: "OPORTUNIDAD DE CATÁLOGO",
        title: `"${track.track}" (${track.artist_display}) podría revivir — ${trend.genre} está creciendo`,
        subjectType: "track_label",
        subjectKey: track.id,
        subjectName: track.track,
        regionFocus: trend.region === "AR" ? "AR" : "foreign_relevant_to_ar",
        sourceType: "catalog_genre_trend",
        opportunityScore: score,
        scoringVersion: version,
        scoreBreakdown: breakdown,
        metrics: {
          genre: trend.genre,
          trendDirection: trend.trendDirection,
          trendSignalId: trend.id,
          trackReleaseDate: track.release_date,
          trackSello: track.sello,
        },
        compatibility,
        suggestedSello: track.sello,
        sources: [
          {
            type: "catalog_genre_trend",
            label: `Tendencia de género: ${trend.genre}`,
            url: trend.evidenceUrl,
            asOf: trend.reportedAt,
            note: trend.note,
          },
        ],
      });

      if (existingBefore) updated++;
      else created++;
    }
  }

  return { scanned, created, updated };
}

// Gemini narrative for a single OPORTUNIDAD DE CATÁLOGO opportunity — a
// genuine strategic write-up (which of OUR tracks to relaunch, who could
// feature/remix it, which producer, what commercial angle), never touching
// the deterministic score computed above. Full "flash" (thinking-capable),
// not "flash-lite" — this is open creative/commercial judgment, the same
// tier lib/legalDocClassifier.ts uses for its own judgment calls.
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-flash-latest";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    cancionesRecomendadas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          trackId: { type: "STRING" },
          track: { type: "STRING" },
          artistDisplay: { type: "STRING" },
          motivo: { type: "STRING" },
        },
        required: ["trackId", "track", "artistDisplay", "motivo"],
      },
    },
    artistasCompatibles: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, motivo: { type: "STRING" } },
        required: ["name", "motivo"],
      },
    },
    featuringsPosibles: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, motivo: { type: "STRING" } },
        required: ["name", "motivo"],
      },
    },
    productoresSugeridos: { type: "ARRAY", items: { type: "STRING" } },
    estrategiaComercial: { type: "STRING" },
  },
  required: ["cancionesRecomendadas", "artistasCompatibles", "featuringsPosibles", "productoresSugeridos", "estrategiaComercial"],
};

function buildPrompt(params: {
  track: CatalogTrack;
  trend: ArGenreTrendSignal | null;
  compatibleArtists: { name: string; sello: string | null; hasCollabHistory: boolean }[];
  producerPool: string[];
}): string {
  const { track, trend, compatibleArtists, producerPool } = params;

  const artistsListStr = compatibleArtists.length
    ? compatibleArtists.map((a) => `- ${a.name} (sello: ${a.sello ?? "s/d"}${a.hasCollabHistory ? ", ya colaboró antes con este artista" : ""})`).join("\n")
    : "Ninguno detectado — no hay artistas propios con lanzamientos reales en este género todavía.";

  const producersStr = producerPool.length
    ? producerPool.join(", ")
    : "No hay productores registrados en nuestro catálogo para este género todavía — no inventes nombres, dejá el array vacío o sugerí perfiles genéricos sin nombre propio.";

  const trendStr = trend
    ? `Género "${trend.genre}" reportado como en crecimiento (${trend.sourceType}, ${trend.reportedAt}).${trend.note ? ` Nota: ${trend.note}` : ""}`
    : "Sin detalle adicional de la tendencia.";

  return `Sos el Director de A&R de un sello discográfico argentino, evaluando si conviene relanzar un fonograma propio ya existente en vez de producir uno nuevo — el sello ya tiene los derechos, así que el riesgo es mucho menor.

TRACK PROPIO A EVALUAR
- Título: "${track.track}"
- Artista: ${track.artist_display}
- Sello: ${track.sello ?? "s/d"}
- Fecha de lanzamiento original: ${track.release_date ?? "s/d"}
- Productor original: ${track.producer ?? "s/d"}

SEÑAL DE MERCADO QUE DISPARÓ ESTA EVALUACIÓN
${trendStr}

ARTISTAS PROPIOS DEL ROSTER, REALMENTE COMPATIBLES CON ESTE GÉNERO (lista cerrada — para "artistasCompatibles" y "featuringsPosibles" SOLO podés usar nombres de esta lista, copiados EXACTAMENTE. Si ninguno encaja bien, dejá esos arrays vacíos — no inventes artistas ni sugieras a alguien externo al roster):
${artistsListStr}

PRODUCTORES REALES DE NUESTRO CATÁLOGO EN ESTE GÉNERO (lista cerrada para "productoresSugeridos" — copiá el nombre EXACTO si corresponde, o dejá el array vacío):
${producersStr}

INSTRUCCIONES
- "cancionesRecomendadas": incluí ESTE track (trackId="${track.id}", track="${track.track}", artistDisplay="${track.artist_display}") con un motivo concreto de por qué conviene revivirlo ahora. Si hay evidencia real de otro track propio relacionado, podés mencionarlo, pero el foco principal es este.
- "artistasCompatibles": de la lista cerrada de arriba, quiénes serían compatibles con una nueva versión/remix de este track, y por qué.
- "featuringsPosibles": de la misma lista cerrada, qué featurings concretos podrían funcionar — considerá tamaño relativo y si ya colaboraron antes.
- "productoresSugeridos": de la lista cerrada de productores, quién podría modernizar el sonido — si la lista está vacía, dejá el array vacío.
- "estrategiaComercial": 3-4 líneas concretas — remix, reversión, o relanzamiento tal cual; por qué ahora; qué riesgo tiene (bajo, porque los derechos ya están).
- No inventes ningún nombre propio de artista o productor que no esté en las listas cerradas de arriba.
- Escribí todo en español rioplatense, tono directo y profesional, con tildes y ñ correctos.
- Respondé únicamente con el JSON solicitado.`;
}

export async function generateCatalogRevivalNarrative(opportunityId: string): Promise<ArCatalogRevivalNarrative> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const opportunity = await getOpportunity(opportunityId);
  if (!opportunity) throw new Error("Oportunidad no encontrada.");
  if (opportunity.subjectType !== "track_label") {
    throw new Error("Esta oportunidad no es de tipo catálogo — no se puede generar una narrativa de revival.");
  }

  const track = await getTrack(opportunity.subjectKey ?? "");
  if (!track) throw new Error("No se encontró el track de catálogo asociado a esta oportunidad.");

  const genre = (opportunity.metrics?.genre as string | undefined) ?? track.genero ?? "";
  const trends = await listActiveGrowingGenreTrends();
  const trend = trends.find((t) => t.genre.toLowerCase() === genre.toLowerCase()) ?? null;

  const compatibleArtists = (opportunity.compatibility?.matchedArtists ?? []).map((m) => ({
    name: m.name,
    sello: m.sello,
    hasCollabHistory: m.hasCollabHistory,
  }));

  const { rows: producerRows } = await sql`
    SELECT DISTINCT producer FROM catalog_tracks
    WHERE producer IS NOT NULL AND producer <> '' AND genero ILIKE ${genre}
    LIMIT 10
  `;
  const producerPool = (producerRows as { producer: string }[]).map((r) => r.producer);

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt({ track, trend, compatibleArtists, producerPool }) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido.");

  const narrative = JSON.parse(text) as ArCatalogRevivalNarrative;
  await setOpportunityNarrative(opportunityId, { catalogRevival: narrative, generatedAt: new Date().toISOString() });
  return narrative;
}
