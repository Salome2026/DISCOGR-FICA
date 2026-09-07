// Chat conversacional del agente de A&R — primer uso de multi-turno en el
// proyecto (todo lo demás en lib/gemini.ts / lib/arMarketIntelligence.ts es
// one-shot). Misma disciplina de siempre: el modelo nunca inventa un
// nombre/id que no esté en una lista cerrada, y nunca ejecuta ninguna
// escritura — no tiene tools ni function-calling declarados, solo puede
// devolver texto + una lista de ids ya validados contra esa lista cerrada.
import { listRecentOpportunitiesFor } from "@/lib/db/arOpportunities";
import { getLatestMarketSnapshot } from "@/lib/db/arMarketSnapshots";
import type { ArAgentPersona } from "@/lib/db/arAgentSettings";

const CONTEXT_OPPORTUNITIES_LIMIT = 15;

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
// Full "flash" (thinking-capable) — conversación abierta es juicio real, no
// extracción acotada, mismo criterio que arMarketIntelligence.ts.
const MODEL = "gemini-flash-latest";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    referencedOpportunityIds: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["reply", "referencedOpportunityIds"],
};

export type ArChatHistoryTurn = { role: "user" | "model"; content: string };

async function buildContextBlock(email: string, roles: string[]): Promise<{ text: string; closedIds: string[] }> {
  const [recent, snapshot] = await Promise.all([
    listRecentOpportunitiesFor(email, roles, CONTEXT_OPPORTUNITIES_LIMIT),
    getLatestMarketSnapshot("combined"),
  ]);
  const oppStr = recent.length
    ? recent
        .map(
          (o) =>
            `- id="${o.id}" [${o.category}] estado=${o.status}${o.opportunityScore != null ? ` score=${o.opportunityScore}` : ""}: "${o.title}" (sujeto: ${o.subjectName}${o.suggestedSello ? `, sello sugerido: ${o.suggestedSello}` : ""})`
        )
        .join("\n")
    : "No hay oportunidades cargadas todavía en el sistema (o ninguna asignada a este usuario) — decilo explícitamente si te preguntan por esto, no inventes ninguna.";

  const snapshotStr = snapshot
    ? `Último resumen de mercado (generado ${new Date(snapshot.generatedAt).toLocaleDateString("es-AR")}):\n${snapshot.narrative.resumenGeneral}\nHallazgos clave: ${snapshot.narrative.hallazgosClave.map((h) => h.titulo).join("; ") || "ninguno"}\nGéneros en crecimiento reportados: ${snapshot.narrative.generosEnCrecimientoAR.join(", ") || "ninguno con evidencia todavía"}`
    : "Todavía no se generó ningún resumen de mercado — si te preguntan por tendencias generales, decilo explícitamente.";

  const text = `OPORTUNIDADES RECIENTES VISIBLES PARA ESTE USUARIO (lista cerrada de ids reales — "referencedOpportunityIds" SOLO puede contener ids de esta lista, nunca inventes uno)\n${oppStr}\n\n${snapshotStr}`;
  return { text, closedIds: recent.map((o) => o.id) };
}

function buildSystemInstruction(persona: ArAgentPersona): string {
  return `Sos ${persona.name}, el agente de A&R virtual de este sello discográfico. Tono: ${persona.tone}. ${persona.description}

REGLAS DURAS, SIN EXCEPCIONES:
- Nunca inventes datos, números, nombres de artistas o ids de oportunidades que no te haya dado explícitamente el contexto que te paso en cada turno.
- Si te preguntan por algo sin datos reales disponibles, decilo explícitamente ("no tengo datos de eso todavía") — nunca lo completes con una suposición ni una cifra inventada.
- "referencedOpportunityIds" solo puede contener ids que aparezcan literalmente en el contexto del turno actual — nunca inventes un id ni reutilices uno de un turno anterior si no te lo repiten.
- Nunca afirmes haber contactado a nadie, haber enviado un mensaje o haber ejecutado una acción por tu cuenta — no tenés esa capacidad técnica. Si te piden "mandale esto a tal persona", respondé sugiriendo la acción concreta que la persona humana puede tomar desde la plataforma, nunca que vos ya la hiciste.
- No uses frases de relleno de IA genérica tipo "se ha detectado una anomalía positiva" o "es importante destacar que" — hablá simple y directo, como alguien con años de experiencia real en la industria discográfica argentina.
- Escribí siempre en español rioplatense, con tildes y ñ correctos.
- Respondé únicamente con el JSON solicitado por el schema, nunca texto libre fuera de él.`;
}

export async function chatWithAgent(input: {
  persona: ArAgentPersona;
  history: ArChatHistoryTurn[];
  message: string;
  userEmail: string;
  userRoles: string[];
}): Promise<{ reply: string; referencedOpportunityIds: string[]; groundingSnapshot: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const { text: contextBlock, closedIds } = await buildContextBlock(input.userEmail, input.userRoles);

  // El contexto se manda como un intercambio "primer" separado del mensaje
  // real del usuario — así se puede refrescar en cada turno (los datos
  // pueden cambiar entre mensajes) sin ensuciar el historial visible que se
  // persiste y se le muestra al usuario.
  const contents = [
    ...input.history.map((h) => ({ role: h.role, parts: [{ text: h.content }] })),
    {
      role: "user",
      parts: [{ text: `[Contexto interno de la plataforma, no es un mensaje del usuario — usalo para fundamentar tu próxima respuesta]\n\n${contextBlock}` }],
    },
    { role: "model", parts: [{ text: "Entendido, tengo el contexto actualizado." }] },
    { role: "user", parts: [{ text: input.message }] },
  ];

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemInstruction(input.persona) }] },
      contents,
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

  const parsed = JSON.parse(text) as { reply?: unknown; referencedOpportunityIds?: unknown };

  // El schema le pide a Gemini un string no vacío, pero nunca hay que
  // confiar ciegamente en que lo respetó — un reply vacío/no-string rompe
  // la columna NOT NULL de ar_chat_messages más abajo.
  if (typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    throw new Error("Gemini no devolvió una respuesta válida.");
  }

  // Red de seguridad del lado del servidor — nunca confiar ciegamente en que
  // el modelo respetó la lista cerrada solo porque el prompt se lo pidió.
  const validIds = new Set(closedIds);
  const rawIds = Array.isArray(parsed.referencedOpportunityIds) ? parsed.referencedOpportunityIds : [];
  const referencedOpportunityIds = rawIds.filter((id): id is string => typeof id === "string" && validIds.has(id));

  return { reply: parsed.reply, referencedOpportunityIds, groundingSnapshot: contextBlock };
}
