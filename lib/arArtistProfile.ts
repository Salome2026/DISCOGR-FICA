import { sql } from "@vercel/postgres";
import { getArtistCatalogHistory, type CatalogTrack } from "@/lib/db/catalog";
import { getRankingLatest, type RankingRow } from "@/lib/db/listeners";
import { getRosterArtistEntries } from "@/lib/roster";
import { normalizeName } from "@/lib/participants";
import type { ArArtistCreativeProfile } from "@/lib/db/arArtistProfiles";

// Full "flash" (thinking-capable) — identidad/branding/storytelling es
// juicio creativo real, no extracción acotada, mismo criterio que
// lib/arMarketIntelligence.ts y lib/arCatalogRevival.ts.
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-flash-latest";

// Evita gastar una llamada a Gemini (y dejar basura en ar_artist_profiles)
// para un nombre que ni siquiera es un artista real del roster — cualquiera
// con editar_ar podría, si no, pegarle directo a la ruta con un string
// cualquiera sin pasar por el picker.
export async function isRosterArtist(artistName: string): Promise<{ name: string; sello: string } | null> {
  const norm = normalizeName(artistName);
  const roster = await getRosterArtistEntries({ excludeSellos: ["Remix", "Streamings"] });
  return roster.find((a) => normalizeName(a.name) === norm) ?? null;
}

export type ArtistDataSnapshot = {
  artistName: string;
  sello: string | null;
  growth: {
    monthlyListeners: number | null;
    prev7d: number | null;
    prev30d: number | null;
    followers: number | null;
    measuredAt: string | null;
  } | null;
  catalogHistory: { track: string; releaseDate: string | null; genero: string | null; producer: string | null }[];
  playlists: string[];
  relatedOpportunities: { id: string; category: string; title: string; status: string }[];
};

// Solo recolección, sin IA — cada campo con su propio fallback honesto para
// que el prompt de abajo nunca tenga que inventar nada cuando falta un dato.
// `rankingOverride` evita un segundo full-scan de artist_listeners_daily
// cuando el caller (la ruta de opportunity-profile) ya lo pidió para armar
// el candidatePool — mismos datos, un solo fetch.
export async function buildArtistDataSnapshot(artistName: string, rankingOverride?: RankingRow[]): Promise<ArtistDataSnapshot> {
  const [catalogHistory, ranking, playlistRows, opportunityRows] = await Promise.all([
    getArtistCatalogHistory(artistName, 8),
    rankingOverride ? Promise.resolve(rankingOverride) : getRankingLatest(),
    sql`
      SELECT DISTINCT sp.name FROM spotify_playlist_tracks spt
      JOIN catalog_tracks ct ON ct.id = spt.catalog_track_id
      JOIN spotify_playlists sp ON sp.id = spt.playlist_id
      WHERE spt.removed_at IS NULL AND ct.participants @> ${JSON.stringify([artistName])}::jsonb
      LIMIT 10
    `,
    sql`
      SELECT id, category, title, status FROM ar_opportunities
      WHERE archived = false AND subject_name ILIKE ${artistName}
      ORDER BY created_at DESC LIMIT 5
    `,
  ]);

  const norm = normalizeName(artistName);
  const rankingRow = ranking.find((r) => normalizeName(r.artist_name) === norm) ?? null;
  const sello = rankingRow?.sello ?? (catalogHistory[0] as CatalogTrack | undefined)?.sello ?? null;

  return {
    artistName,
    sello,
    growth: rankingRow
      ? {
          monthlyListeners: rankingRow.monthly_listeners,
          prev7d: rankingRow.prev_7d,
          prev30d: rankingRow.prev_30d,
          followers: rankingRow.followers,
          measuredAt: rankingRow.measured_at,
        }
      : null,
    catalogHistory: catalogHistory.map((t) => ({
      track: t.track,
      releaseDate: t.release_date,
      genero: t.genero,
      producer: t.producer,
    })),
    playlists: (playlistRows.rows as { name: string }[]).map((r) => r.name),
    relatedOpportunities: (opportunityRows.rows as { id: string; category: string; title: string; status: string }[]).map((r) => r),
  };
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    posicionamiento: { type: "STRING" },
    diferenciador: { type: "STRING" },
    fortalezas: { type: "ARRAY", items: { type: "STRING" } },
    debilidades: { type: "ARRAY", items: { type: "STRING" } },
    oportunidades: { type: "ARRAY", items: { type: "STRING" } },
    identidadVisual: { type: "STRING" },
    identidadSonora: { type: "STRING" },
    storytelling: { type: "STRING" },
    universoCreativo: { type: "STRING" },
    comunidad: { type: "STRING" },
    direccionArtisticaSugerida: { type: "STRING" },
    referenciasNacionales: { type: "ARRAY", items: { type: "STRING" } },
    referenciasInternacionales: { type: "ARRAY", items: { type: "STRING" } },
    justificacion: { type: "STRING" },
  },
  required: [
    "posicionamiento", "diferenciador", "fortalezas", "debilidades", "oportunidades",
    "identidadVisual", "identidadSonora", "storytelling", "universoCreativo", "comunidad",
    "direccionArtisticaSugerida", "referenciasNacionales", "referenciasInternacionales", "justificacion",
  ],
};

function buildPrompt(snapshot: ArtistDataSnapshot): string {
  const growthStr = snapshot.growth?.monthlyListeners != null
    ? `${snapshot.growth.monthlyListeners} oyentes mensuales en Spotify${snapshot.growth.prev30d != null ? ` (hace 30 días: ${snapshot.growth.prev30d})` : ""}${snapshot.growth.followers != null ? `, ${snapshot.growth.followers} seguidores` : ""}.`
    : "Sin datos de Chartmetric/Spotify disponibles todavía para este artista — no inventes cifras, hablá de audiencia en términos cualitativos.";

  const catalogStr = snapshot.catalogHistory.length
    ? snapshot.catalogHistory.map((t) => `- "${t.track}"${t.releaseDate ? ` (${t.releaseDate})` : ""}${t.genero ? `, género: ${t.genero}` : ""}${t.producer ? `, productor: ${t.producer}` : ""}`).join("\n")
    : "Sin lanzamientos propios registrados en el catálogo todavía.";

  const playlistsStr = snapshot.playlists.length
    ? `Aparece en estas playlists propias del sello: ${snapshot.playlists.join(", ")}.`
    : "Todavía no aparece en ninguna playlist propia del sello.";

  const opportunitiesStr = snapshot.relatedOpportunities.length
    ? snapshot.relatedOpportunities.map((o) => `- [${o.category}] "${o.title}" (estado: ${o.status})`).join("\n")
    : "Sin hallazgos de A&R recientes sobre este artista.";

  return `Sos el Director de A&R de un sello discográfico argentino, armando un análisis profundo de identidad y branding para uno de los artistas del roster propio — el objetivo es ayudar a construir su carrera, no describir números.

ARTISTA: ${snapshot.artistName}${snapshot.sello ? ` (sello: ${snapshot.sello})` : ""}

AUDIENCIA REAL
${growthStr}

HISTORIAL DE LANZAMIENTOS PROPIOS (más recientes primero)
${catalogStr}

PRESENCIA EN PLAYLISTS PROPIAS (señal real de alcance/curación)
${playlistsStr}

HALLAZGOS DE A&R RELACIONADOS
${opportunitiesStr}

INSTRUCCIONES
- "posicionamiento": cómo se ubica hoy este artista frente al mercado, en 2-3 líneas concretas.
- "diferenciador": qué lo distingue realmente de otros artistas similares — no genérico.
- "fortalezas"/"debilidades"/"oportunidades": 3-5 ítems concretos cada uno, basados en los datos de arriba.
- "identidadVisual"/"identidadSonora": una descripción concreta y accionable de cada una, coherente con el género/historial real.
- "storytelling": qué narrativa/historia se puede construir alrededor de este artista para conectar con audiencia.
- "universoCreativo": qué mundo visual/temático podría acompañar su música.
- "comunidad": qué dice la presencia (o ausencia) en playlists propias sobre su comunidad/alcance real.
- "direccionArtisticaSugerida": una recomendación concreta de hacia dónde llevar su carrera en los próximos meses.
- "referenciasNacionales"/"referenciasInternacionales": artistas reales (existentes, no inventados) que sirvan de referencia de carrera o estética — pueden ser de cualquier sello, no hace falta que sean del roster propio.
- "justificacion": por qué esta lectura tiene sentido dado lo que sabemos de este artista puntual.
- Si un dato no está disponible (ej. sin datos de audiencia), decilo explícitamente en el texto en vez de inventarlo.
- Escribí todo en español rioplatense, tono profesional y directo, con tildes y ñ correctos.
- Respondé únicamente con el JSON solicitado.`;
}

export async function generateArtistCreativeProfile(snapshot: ArtistDataSnapshot): Promise<ArArtistCreativeProfile> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(snapshot) }] }],
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

  return JSON.parse(text) as ArArtistCreativeProfile;
}
