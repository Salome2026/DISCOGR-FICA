import { sql } from "@vercel/postgres";
import { getRosterArtistEntries } from "@/lib/roster";
import { getRankingLatest, type RankingRow } from "@/lib/db/listeners";
import { normalizeName } from "@/lib/participants";
import type { ArtistDataSnapshot } from "@/lib/arArtistProfile";
import type { ArArtistOpportunityProfile } from "@/lib/db/arArtistProfiles";

// Mismo modelo/criterio que arArtistProfile.ts — parejas de featuring y
// evaluación de riesgo son juicio real, no extracción acotada.
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-flash-latest";

export type ArtistCandidatePool = {
  rosterArtists: { name: string; sello: string; monthlyListeners: number | null }[];
  producers: string[];
};

// Se arma en código, real y cerrado — nunca se le pide a Gemini que
// "piense" en quién podría ser un buen featuring sin dárselo ya resuelto:
// mismo criterio de "lista cerrada de nombres reales" que arCatalogRevival.ts.
// "Streamings" se excluye del roster acá igual que en catálogo/revival — son
// perfiles de canal/compilado, no artistas reales, no tiene sentido
// sugerirlos como featuring. `rankingOverride` evita un segundo full-scan de
// artist_listeners_daily cuando el caller ya lo pidió para el snapshot.
export async function buildArtistCandidatePool(artistName: string, rankingOverride?: RankingRow[]): Promise<ArtistCandidatePool> {
  const norm = normalizeName(artistName);
  const [roster, ranking, producerRows] = await Promise.all([
    getRosterArtistEntries({ excludeSellos: ["Remix", "Streamings"] }),
    rankingOverride ? Promise.resolve(rankingOverride) : getRankingLatest(),
    sql`
      SELECT producer, count(*)::int AS uses FROM catalog_tracks
      WHERE producer IS NOT NULL AND producer <> ''
      GROUP BY producer ORDER BY uses DESC LIMIT 15
    `,
  ]);

  const listenersByName = new Map<string, number | null>();
  for (const r of ranking) listenersByName.set(normalizeName(r.artist_name), r.monthly_listeners);

  const seen = new Set<string>();
  const rosterArtists: ArtistCandidatePool["rosterArtists"] = [];
  for (const entry of roster) {
    const entryNorm = normalizeName(entry.name);
    if (entryNorm === norm || seen.has(entryNorm)) continue;
    seen.add(entryNorm);
    rosterArtists.push({ name: entry.name, sello: entry.sello, monthlyListeners: listenersByName.get(entryNorm) ?? null });
  }

  return {
    rosterArtists,
    producers: (producerRows.rows as { producer: string }[]).map((r) => r.producer),
  };
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sonidosSugeridos: { type: "ARRAY", items: { type: "STRING" } },
    generosCompatibles: { type: "ARRAY", items: { type: "STRING" } },
    tempoSugerido: { type: "STRING" },
    productoresSugeridos: { type: "ARRAY", items: { type: "STRING" } },
    featuringsSugeridos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, motivo: { type: "STRING" } },
        required: ["name", "motivo"],
      },
    },
    potencialComercial: {
      type: "OBJECT",
      properties: {
        probabilidadExito: { type: "STRING" },
        nivelDeRiesgo: { type: "STRING" },
        inversionRecomendada: { type: "STRING" },
        mercadosRecomendados: { type: "ARRAY", items: { type: "STRING" } },
        justificacion: { type: "STRING" },
      },
      required: ["probabilidadExito", "nivelDeRiesgo", "inversionRecomendada", "mercadosRecomendados", "justificacion"],
    },
  },
  required: ["sonidosSugeridos", "generosCompatibles", "tempoSugerido", "productoresSugeridos", "featuringsSugeridos", "potencialComercial"],
};

function buildPrompt(snapshot: ArtistDataSnapshot, pool: ArtistCandidatePool): string {
  const growthStr = snapshot.growth?.monthlyListeners != null
    ? `${snapshot.growth.monthlyListeners} oyentes mensuales en Spotify.`
    : "Sin datos de audiencia disponibles todavía.";

  const catalogStr = snapshot.catalogHistory.length
    ? snapshot.catalogHistory.map((t) => `- "${t.track}"${t.genero ? ` (${t.genero})` : ""}`).join("\n")
    : "Sin lanzamientos propios registrados.";

  const rosterStr = pool.rosterArtists.length
    ? pool.rosterArtists
        .map((a) => `- ${a.name} (sello: ${a.sello}${a.monthlyListeners != null ? `, ${a.monthlyListeners} oyentes mensuales` : ", sin datos de audiencia"})`)
        .join("\n")
    : "No hay otros artistas propios registrados todavía.";

  const producersStr = pool.producers.length
    ? pool.producers.join(", ")
    : "No hay productores registrados en el catálogo todavía — dejá el array vacío, no inventes nombres.";

  return `Sos el Director de A&R de un sello discográfico argentino, evaluando canciones/sonido, featurings posibles y potencial comercial para un artista puntual del roster propio.

ARTISTA: ${snapshot.artistName}${snapshot.sello ? ` (sello: ${snapshot.sello})` : ""}
AUDIENCIA: ${growthStr}

LANZAMIENTOS PROPIOS RECIENTES
${catalogStr}

OTROS ARTISTAS DEL ROSTER PROPIO — lista cerrada de nombres reales (SOLO estos pueden aparecer en "featuringsSugeridos"; si ninguno encaja, dejá el array vacío, nunca sugieras a alguien externo al roster ni inventes un nombre):
${rosterStr}

PRODUCTORES REALES DE NUESTRO CATÁLOGO — lista cerrada (SOLO estos pueden aparecer en "productoresSugeridos"; si ninguno encaja, dejá el array vacío):
${producersStr}

INSTRUCCIONES
- "sonidosSugeridos": 3-5 direcciones sonoras concretas para el próximo lanzamiento, coherentes con su historial.
- "generosCompatibles": géneros reales compatibles con su sonido actual, que podría explorar.
- "tempoSugerido": describilo en términos cualitativos (ej. "uptempo, alta energía, ideal para pista de baile") — nunca inventes un número de BPM, no hay ninguna fuente real de BPM disponible.
- "productoresSugeridos": de la lista cerrada de arriba, quién podría encajar y por qué — array vacío si ninguno.
- "featuringsSugeridos": de la lista cerrada de artistas del roster de arriba, qué parejas concretas tendrían sentido (considerá tamaño relativo de audiencia — evitá parejas desproporcionadas) y por qué — array vacío si ninguno encaja.
- "potencialComercial": evaluación honesta de probabilidad de éxito, nivel de riesgo, inversión recomendada y mercados — si la audiencia es chica o no hay datos, un riesgo "bajo" sin justificación real no es aceptable, la justificación tiene que ser consistente con los datos reales de arriba.
- Nunca inventes un nombre propio de artista o productor que no esté en las listas cerradas.
- Escribí todo en español rioplatense, tono profesional y directo, con tildes y ñ correctos.
- Respondé únicamente con el JSON solicitado.`;
}

export async function generateArtistOpportunityProfile(
  snapshot: ArtistDataSnapshot,
  pool: ArtistCandidatePool
): Promise<ArArtistOpportunityProfile> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(snapshot, pool) }] }],
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

  const parsed = JSON.parse(text) as ArArtistOpportunityProfile;

  // Red de seguridad del lado del servidor — nunca confiar ciegamente en que
  // el modelo respetó la lista cerrada solo porque el prompt se lo pidió.
  // Se matchea por nombre normalizado (no exacto) y se restaura el nombre
  // "lindo" real de la lista cerrada — así una variante de mayúscula/tilde
  // que Gemini haya devuelto para un nombre válido no lo descarta por error.
  const artistsByNorm = new Map(pool.rosterArtists.map((a) => [normalizeName(a.name), a.name]));
  const producersByNorm = new Map(pool.producers.map((p) => [normalizeName(p), p]));
  const featuringsSugeridos = (parsed.featuringsSugeridos ?? [])
    .map((f) => {
      const real = artistsByNorm.get(normalizeName(f.name));
      return real ? { ...f, name: real } : null;
    })
    .filter((f): f is { name: string; motivo: string } => !!f);
  const productoresSugeridos = (parsed.productoresSugeridos ?? [])
    .map((p) => producersByNorm.get(normalizeName(p)))
    .filter((p): p is string => !!p);

  return { ...parsed, featuringsSugeridos, productoresSugeridos };
}
