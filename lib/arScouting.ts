import { getOpportunity, getRecentScoutingDecisions, setOpportunityNarrative } from "@/lib/db/arOpportunities";
import { getScoutingCriteria } from "@/lib/db/arScoutingSettings";
import type { ArScoutingAssessment } from "@discografica/shared/types/ar";

// Encuadrado con honestidad como curación + memoria institucional, no
// descubrimiento automático — no hay ninguna API de "artistas similares" en
// ninguna fuente integrada (Chartmetric no la tiene en este tier, y TikTok/
// Instagram no tienen API gratuita). Se apoya en dos cosas 100% reales: el
// documento de criterios vigente y decisiones de scouting pasadas.
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-flash-latest";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    fitConCriterios: { type: "STRING" },
    señalesPositivas: { type: "ARRAY", items: { type: "STRING" } },
    señalesDeAlerta: { type: "ARRAY", items: { type: "STRING" } },
    comparableConDecisionesPasadas: { type: "STRING" },
    recomendacion: { type: "STRING" },
  },
  required: ["fitConCriterios", "señalesPositivas", "señalesDeAlerta", "comparableConDecisionesPasadas", "recomendacion"],
};

export async function generateScoutingAssessment(opportunityId: string): Promise<ArScoutingAssessment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const opportunity = await getOpportunity(opportunityId);
  if (!opportunity) throw new Error("Oportunidad no encontrada.");
  if (opportunity.subjectType !== "artist_external") {
    throw new Error("Esta oportunidad no es un candidato externo — no se puede generar una evaluación de scouting.");
  }

  const [criteria, pastDecisions] = await Promise.all([
    getScoutingCriteria(),
    getRecentScoutingDecisions(8, opportunityId),
  ]);

  const metricsStr = opportunity.metrics && Object.keys(opportunity.metrics).length
    ? Object.entries(opportunity.metrics).map(([k, v]) => `- ${k}: ${v}`).join("\n")
    : "Sin métricas cuantitativas cargadas para este candidato — evalúalo en términos cualitativos.";

  const sourcesStr = opportunity.sources.length
    ? opportunity.sources.map((s) => `- ${s.label}${s.note ? ` (${s.note})` : ""}${s.asOf ? `, al ${s.asOf}` : ""}`).join("\n")
    : "Sin fuentes registradas.";

  const decisionsStr = pastDecisions.length
    ? pastDecisions
        .map((d) => `- "${d.opportunity.subjectName}" → ${d.opportunity.status}${d.lastComment ? ` — nota: "${d.lastComment}"` : ""}`)
        .join("\n")
    : "Todavía no hay decisiones de scouting anteriores registradas — evaluá solo contra los criterios, sin comparar con historial.";

  const prompt = `Sos el Director de A&R de un sello discográfico argentino, evaluando si conviene contactar a un candidato externo (no forma parte del roster propio todavía).

CANDIDATO: ${opportunity.subjectName}
Título del hallazgo: "${opportunity.title}"
Categoría: ${opportunity.category}
Sello sugerido si se incorpora: ${opportunity.suggestedSello ?? "sin definir todavía"}

MÉTRICAS/DATOS REALES DEL CANDIDATO
${metricsStr}

FUENTES
${sourcesStr}

CRITERIOS DE SCOUTING VIGENTES DEL SELLO (documento real, editable por el equipo de A&R)
${criteria.text}

DECISIONES DE SCOUTING REALES ANTERIORES (para comparar, lista cerrada — nunca inventes una decisión que no esté acá)
${decisionsStr}

INSTRUCCIONES
- "fitConCriterios": qué tan bien encaja este candidato con el documento de criterios de arriba — sé específico, citá qué criterio cumple o no cumple.
- "señalesPositivas": 3-5 señales concretas a favor, basadas en los datos/fuentes reales de arriba.
- "señalesDeAlerta": señales de riesgo o dudas reales — si no hay ninguna, un array corto reconociendo que falta información es preferible a inventar un riesgo.
- "comparableConDecisionesPasadas": si hay una decisión pasada real parecida (mismo perfil, mismo tipo de señal), nombrala explícitamente y explicá el paralelismo; si no hay ninguna comparable, decilo con honestidad.
- "recomendacion": una recomendación concreta y accionable (ej. "Contactar ahora", "Seguir de cerca un tiempo más", "Descartar por ahora") con el motivo en una frase.
- Nunca inventes una métrica, una fuente o una decisión pasada que no esté en los datos de arriba.
- Escribí todo en español rioplatense, tono profesional y directo, con tildes y ñ correctos.
- Respondé únicamente con el JSON solicitado.`;

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
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

  const parsed = JSON.parse(text) as Record<string, unknown>;
  if (
    typeof parsed.fitConCriterios !== "string" || !parsed.fitConCriterios.trim() ||
    typeof parsed.recomendacion !== "string" || !parsed.recomendacion.trim() ||
    typeof parsed.comparableConDecisionesPasadas !== "string" || !parsed.comparableConDecisionesPasadas.trim()
  ) {
    throw new Error("Gemini no devolvió una evaluación válida.");
  }
  const assessment: ArScoutingAssessment = {
    fitConCriterios: parsed.fitConCriterios,
    señalesPositivas: Array.isArray(parsed.señalesPositivas) ? parsed.señalesPositivas.filter((s): s is string => typeof s === "string") : [],
    señalesDeAlerta: Array.isArray(parsed.señalesDeAlerta) ? parsed.señalesDeAlerta.filter((s): s is string => typeof s === "string") : [],
    comparableConDecisionesPasadas: parsed.comparableConDecisionesPasadas,
    recomendacion: parsed.recomendacion,
    generatedAt: new Date().toISOString(),
  };
  await setOpportunityNarrative(opportunityId, { scoutingAssessment: assessment, generatedAt: assessment.generatedAt });
  return assessment;
}
