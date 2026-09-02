// Sugerencias de contenido para Community Manager — misma disciplina que
// lib/gemini.ts / lib/arMarketIntelligence.ts (A&R): responseSchema forzado,
// lista cerrada de contenidos reales (nunca un id inventado), fallback
// textual explícito cuando falta historial, nunca una sugerencia armada sin
// datos reales detrás.
import { getTopContentByMetric } from "@/lib/db/cmMetrics";
import { listContentForAccount } from "@/lib/db/cmContent";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
// Síntesis/juicio real (comparar formatos, explicar por qué algo funcionó),
// no generación acotada — mismo criterio de A&R para usar el modelo con
// thinking en vez del "lite" que usa el plan de marketing.
const MODEL = "gemini-flash-latest";

export function cmSuggestionsConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export const SUGGESTION_TYPES = [
  "repetir_formato",
  "adaptar_otra_plataforma",
  "idea_artista_similar",
  "segunda_parte",
  "reusar_audio",
  "recortar_a_shorts",
  "mejor_horario",
  "recuperar_contenido_viejo",
] as const;
export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

export type ContentSuggestion = {
  tipoSugerencia: SuggestionType;
  explicacion: string;
  contenidoReferenciaId: number;
};

export type SuggestionsResult =
  | { hasData: true; suggestions: ContentSuggestion[] }
  | { hasData: false; reason: string };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sugerencias: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          tipoSugerencia: { type: "STRING", enum: [...SUGGESTION_TYPES] },
          explicacion: { type: "STRING" },
          contenidoReferenciaId: { type: "INTEGER" },
        },
        required: ["tipoSugerencia", "explicacion", "contenidoReferenciaId"],
      },
    },
  },
  required: ["sugerencias"],
};

function buildPrompt(accountName: string, topByViews: unknown[], topByRetention: unknown[], topByShares: unknown[], allRecent: unknown[]): string {
  return `
Sos un asistente de estrategia de contenido para la cuenta de redes sociales "${accountName}" de un sello discográfico argentino.

Analizá el historial REAL de contenidos y sus métricas reales (abajo, en JSON) y sugerí próximas publicaciones.

REGLAS ESTRICTAS, sin excepción:
- "contenidoReferenciaId" DEBE ser exactamente el "id" de uno de los contenidos listados abajo — nunca inventes un id que no esté en las listas.
- Nunca inventes cifras de rendimiento — usá solo los números que ya están en el JSON.
- Cada sugerencia tiene que explicar POR QUÉ se recomienda, citando el dato real (alcance, retención, compartidos, etc.) del contenido de referencia.
- No repitas la misma sugerencia dos veces.
- Máximo 6 sugerencias.

Top contenidos por vistas: ${JSON.stringify(topByViews)}
Top contenidos por retención: ${JSON.stringify(topByRetention)}
Top contenidos por compartidos: ${JSON.stringify(topByShares)}
Historial reciente completo (para detectar formato/horario/audio que se repite): ${JSON.stringify(allRecent)}
`.trim();
}

// Grounded únicamente en datos reales de esta cuenta. Si no hay suficiente
// historial con métricas cargadas, devuelve el fallback explícito en vez de
// forzar una respuesta de Gemini sin nada real detrás — mismo criterio que
// A&R usa para "no inventes cifras, decilo explícitamente".
export async function generateContentSuggestions(accountId: string, accountName: string): Promise<SuggestionsResult> {
  const [topByViews, topByRetention, topByShares, recent] = await Promise.all([
    getTopContentByMetric([accountId], "views", 5),
    getTopContentByMetric([accountId], "retencion_pct", 5),
    getTopContentByMetric([accountId], "compartidos", 5),
    listContentForAccount(accountId),
  ]);

  if (topByViews.length === 0 && topByRetention.length === 0 && topByShares.length === 0) {
    return { hasData: false, reason: "Todavía no hay suficientes publicaciones con métricas cargadas para esta cuenta." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const validIds = new Set([...topByViews, ...topByRetention, ...topByShares, ...recent].map((r) => Number((r as Record<string, unknown>).id)));

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(accountName, topByViews, topByRetention, topByShares, recent.slice(0, 20)) }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido.");

  const parsed = JSON.parse(text) as { sugerencias: ContentSuggestion[] };
  // Defensa extra más allá del prompt — descarta cualquier sugerencia cuyo
  // id de referencia no exista realmente en los datos que se mandaron,
  // nunca confiamos ciegamente en que el modelo respetó la lista cerrada.
  const suggestions = (parsed.sugerencias ?? []).filter((s) => validIds.has(Number(s.contenidoReferenciaId)));
  return { hasData: true, suggestions };
}
