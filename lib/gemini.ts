// Gemini integration for the AI-generated marketing plan. Uses the raw REST
// API (no SDK) with a fixed JSON response schema so the output can be
// dropped straight into the PDF template without parsing freeform text.
import contentExamplesData from "@/data/content-examples.json";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
// Alias Google keeps pointed at their current recommended flash model —
// avoids hardcoding a model name that gets deprecated later.
// The plain "flash" alias currently resolves to a model whose "thinking"
// can't be disabled (thinkingBudget: 0 → 400 invalid argument), which added
// ~24s to every plan generation. The "lite" alias resolves to a smaller,
// non-thinking model that responds in ~2-4s — the right tradeoff here,
// since this is a bounded, schema-constrained generation task, not open
// reasoning.
const MODEL = "gemini-flash-lite-latest";

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export type ContentExample = {
  tipo: "playlist" | "reel" | "tiktok" | "historia" | "campana";
  titulo: string;
  descripcion: string;
  url: string | null;
};

// Manually curated, WebFetch-verified reference material (data/content-examples.json)
// — Gemini never generates URLs itself (the schema has no url field at all),
// it only sees these as textual inspiration. The links that end up in the
// PDF are inserted directly from this file by PlanPersonalizadoDoc, so a
// link can never be wrong, invented, or dead-on-arrival.
export function getContentExamples(genero: string): ContentExample[] {
  const map = contentExamplesData.generos as Record<string, ContentExample[]>;
  return map[genero] ?? [];
}

// Real calendar dates from today (day of load) through the launch date —
// computed here in code, never left to the model, since LLMs are unreliable
// at date arithmetic and this has to line up with the real calendar exactly.
// Capped so a release scheduled months out doesn't blow up the request; the
// near-term run-up to launch is what actually needs day-by-day granularity.
export function buildCalendarDates(fechaISO: string | null, maxDays = 45): { fecha: string; diaSemana: string }[] {
  if (!fechaISO) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const launch = new Date(`${fechaISO}T00:00:00`);
  if (isNaN(launch.getTime()) || launch < today) return [];

  const days: { fecha: string; diaSemana: string }[] = [];
  const cursor = new Date(today);
  while (cursor <= launch && days.length < maxDays) {
    days.push({
      fecha: cursor.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
      diaSemana: cursor.toLocaleDateString("es-AR", { weekday: "long" }),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export type MarketingPlanInput = {
  artist: string;
  featuring: string[];
  sello: string | null;
  tipo: string;
  fonograma: string;
  fecha: string | null;
  genero: string;
  socialLink: string;
  presupuesto: { tiene: false } | { tiene: true; montoArs: number };
  historialArtista: { titulo: string; fecha: string | null; sello: string | null }[];
  historialFeaturing: { nombre: string; titulo: string; fecha: string | null }[];
  chartmetric: {
    artist: {
      monthlyListeners: number | null;
      rank: number | null;
      topCities: { name: string; countryCode: string }[];
      homeCountry: string | null;
    } | null;
    featuring: {
      nombre: string;
      monthlyListeners: number | null;
      topCities: { name: string; countryCode: string }[];
    } | null;
  };
  contentExamples: ContentExample[];
  // Real calendar dates from "day of load" through the launch date, computed
  // in code (never by Gemini — LLMs are unreliable at date arithmetic and
  // this must line up exactly with the real calendar). Gemini only fills in
  // the content idea for each date; the date itself is echoed back from here
  // by position when rendering, same zero-hallucination pattern as the
  // content-examples links.
  calendario: { fecha: string; diaSemana: string }[];
};

export type MarketingPlanAccion = {
  accion: string;
  cuando: string;
  como: string;
  porQue: string;
  objetivo: string;
  resultadoEsperado: string;
};

export type MarketingPlanCalendarItem = {
  contenido: string;
  plataforma: string;
  formato: string;
};

export type MarketingPlanAI = {
  resumenEstrategico: string;
  secciones: {
    titulo: string;
    contexto: string;
    acciones: MarketingPlanAccion[];
  }[];
  calendarioContenido: MarketingPlanCalendarItem[];
  kpis: { nombre: string; objetivo: string; frecuencia: string }[];
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    resumenEstrategico: { type: "STRING" },
    secciones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titulo: { type: "STRING" },
          contexto: { type: "STRING" },
          acciones: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                accion: { type: "STRING" },
                cuando: { type: "STRING" },
                como: { type: "STRING" },
                porQue: { type: "STRING" },
                objetivo: { type: "STRING" },
                resultadoEsperado: { type: "STRING" },
              },
              required: ["accion", "cuando", "como", "porQue", "objetivo", "resultadoEsperado"],
            },
          },
        },
        required: ["titulo", "contexto", "acciones"],
      },
    },
    calendarioContenido: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          contenido: { type: "STRING" },
          plataforma: { type: "STRING" },
          formato: { type: "STRING" },
        },
        required: ["contenido", "plataforma", "formato"],
      },
    },
    kpis: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nombre: { type: "STRING" },
          objetivo: { type: "STRING" },
          frecuencia: { type: "STRING" },
        },
        required: ["nombre", "objetivo", "frecuencia"],
      },
    },
  },
  required: ["resumenEstrategico", "secciones", "calendarioContenido", "kpis"],
};

function buildPrompt(input: MarketingPlanInput): string {
  const featuringStr = input.featuring.length ? input.featuring.join(", ") : "ninguno";
  const presupuestoStr = input.presupuesto.tiene
    ? `Sí, aproximadamente $${input.presupuesto.montoArs.toLocaleString("es-AR")} ARS.`
    : "No — estrategia 100% orgánica, sin pauta paga.";

  const historialStr = input.historialArtista.length
    ? input.historialArtista.map((h) => `- "${h.titulo}" (${h.fecha ?? "sin fecha"}, sello: ${h.sello ?? "s/d"})`).join("\n")
    : "Sin lanzamientos previos registrados en la plataforma (artista nuevo o primer lanzamiento cargado).";

  const featuringHistStr = input.historialFeaturing.length
    ? input.historialFeaturing.map((h) => `- ${h.nombre}: "${h.titulo}" (${h.fecha ?? "sin fecha"})`).join("\n")
    : "";

  const cmArtist = input.chartmetric.artist;
  const cmArtistStr = cmArtist
    ? `Oyentes mensuales en Spotify: ${cmArtist.monthlyListeners ?? "s/d"}. Ranking global Chartmetric: ${cmArtist.rank ?? "s/d"}. Ciudades con más oyentes: ${cmArtist.topCities.map((c) => `${c.name} (${c.countryCode.toUpperCase()})`).join(", ") || "s/d"}. País base: ${cmArtist.homeCountry ?? "s/d"}.`
    : "No disponible en este momento (sin datos de Chartmetric para este artista o cuota de API agotada) — no inventes cifras, referite a la audiencia de forma cualitativa.";

  const cmFeatStr = input.chartmetric.featuring
    ? `Datos del featuring (${input.chartmetric.featuring.nombre}): oyentes mensuales ${input.chartmetric.featuring.monthlyListeners ?? "s/d"}, ciudades top: ${input.chartmetric.featuring.topCities.map((c) => `${c.name} (${c.countryCode.toUpperCase()})`).join(", ") || "s/d"}.`
    : "";

  const calendarioStr = input.calendario.length
    ? input.calendario.map((d, i) => `${i + 1}. ${d.diaSemana} ${d.fecha}`).join("\n")
    : null;

  const examplesStr = input.contentExamples.length
    ? input.contentExamples
        .map((e) => `- [${e.tipo}] ${e.titulo}: ${e.descripcion}`)
        .join("\n")
    : "No hay formatos de referencia curados todavía para este género — basate en tu conocimiento general de qué funciona en redes para este estilo musical.";

  return `Sos un estratega senior de marketing musical especializado en el mercado argentino/latinoamericano, con el nivel de detalle y profesionalismo de una agencia real. Generá un plan de marketing personalizado, extenso, concreto y accionable para el siguiente lanzamiento — nada de texto genérico de IA, nada de relleno, nada de consejos abstractos tipo "publicá contenido regularmente".

DATOS DEL LANZAMIENTO
- Artista principal: ${input.artist}
- Featuring: ${featuringStr}
- Fonograma: ${input.fonograma}
- Tipo: ${input.tipo}
- Sello: ${input.sello ?? "s/d"}
- Fecha de lanzamiento: ${input.fecha ?? "s/d"}
- Género principal: ${input.genero}
- Red social más fuerte del artista: ${input.socialLink}
- Presupuesto de marketing: ${presupuestoStr}

HISTORIAL DE LANZAMIENTOS DEL ARTISTA EN EL SELLO
${historialStr}

${featuringHistStr ? `HISTORIAL DEL FEATURING\n${featuringHistStr}\n` : ""}
DATOS DE AUDIENCIA (Chartmetric)
Artista principal: ${cmArtistStr}
${cmFeatStr}

FORMATOS DE CONTENIDO QUE FUNCIONAN BIEN EN ESTE GÉNERO (referencia real, verificada)
${examplesStr}

${calendarioStr ? `CALENDARIO REAL — un ítem de "calendarioContenido" por cada uno de estos días, EN ESTE ORDEN EXACTO (son ${input.calendario.length} días, desde hoy hasta el lanzamiento):\n${calendarioStr}\n` : ""}
INSTRUCCIONES
- Generá entre 7 y 9 secciones. Cada sección debe tener un título claro y un contexto breve (2-3 líneas) de por qué esa sección importa PARA ESTE lanzamiento puntual, no en general.
- Cada sección debe tener entre 2 y 4 acciones. Cada acción tiene que especificar, en campos separados: QUÉ hacer (concreto y ejecutable, no un consejo abstracto), CUÁNDO hacerlo (momento relativo al lanzamiento: ej. "7 días antes", "el día del estreno", "primera semana post-lanzamiento"), CÓMO hacerlo paso a paso (instrucciones prácticas que un equipo pueda seguir sin dudas), POR QUÉ funciona (la razón concreta, no genérica), qué OBJETIVO tiene esa acción, y qué RESULTADO ESPERADO es razonable dado el tamaño de audiencia y presupuesto de este artista.
- Incluí como mínimo secciones equivalentes a: Estrategia de pre-save, Cronograma de lanzamiento (día a día o semana a semana), Calendario de contenidos, Ideas de contenido para Reels/TikTok/Shorts (usando y adaptando los formatos de referencia de arriba a este artista y lanzamiento puntual), Estrategia de Spotify y playlisting orgánico, Generación de contenido de fans/UGC${input.presupuesto.tiene ? ", Plan de pauta paga (acorde exactamente al presupuesto indicado, sin proponer campañas desproporcionadas)" : ""}.
- Usá los "formatos de contenido que funcionan bien en este género" de arriba como base real para tus ideas de Reels/TikTok — adaptalos específicamente a este artista, este featuring (si hay) y esta canción, no los copies genéricamente.
- Si hay featuring, incluí una sección o varias acciones específicas sobre campañas cruzadas entre los dos públicos y regiones de afinidad conjunta.
- Usá las ciudades/países de mayor audiencia (si están disponibles) para dar foco geográfico concreto.
- Si el artista tiene lanzamientos previos en el sello, referite a ese historial para dar continuidad (qué construir sobre lo anterior) en vez de tratarlo como debut.
- Si NO hay presupuesto, el plan debe ser 100% orgánico y no debe mencionar pauta paga en ningún punto.
${calendarioStr ? `- "calendarioContenido" tiene que traer EXACTAMENTE ${input.calendario.length} elementos, uno por cada día listado en CALENDARIO REAL, en el mismo orden — no agregues ni quites días, no incluyas la fecha en el texto (eso lo maneja el sistema). Cada día necesita UNA idea de contenido concreta y distinta a la de los demás días (nunca "publicar contenido" genérico), con su plataforma (Instagram, TikTok, YouTube, Spotify, etc.) y formato (Reel, Historia, Post, Video largo, Live, etc.). Usá los datos de audiencia (ciudades top, oyentes mensuales) para decidir intensidad y enfoque: más cerca de la fecha de lanzamiento, contenido más fuerte y frecuente (anuncios, cuentas regresivas, adelantos); los días intermedios pueden ser historias más livianas, contenido de proceso o interacción con fans. Si hay más de un artista (featuring), alterná protagonismo entre ambos.` : `- No se pudo calcular un calendario día a día (falta la fecha de lanzamiento o ya pasó) — dejá "calendarioContenido" como un array vacío.`}
- IMPORTANTE: no incluyas URLs, links ni menciones de "podés ver un ejemplo acá" en ningún campo de texto — el documento final ya inserta por separado los links reales verificados. Vos solo describís las acciones.
- Escribí todo en español rioplatense, tono profesional pero directo, como si lo hubiera preparado un equipo de marketing musical real con años de experiencia en este género.
- Muy importante: usá tildes y tildes en mayúsculas correctamente en todas las palabras que las llevan (campaña, técnicas, orgánicas, años, canción, música, etc.) y la letra ñ donde corresponda. No omitas ningún acento — un texto sin tildes se ve poco profesional.
- Respondé únicamente con el JSON solicitado, sin texto adicional.`;
}

export async function generateMarketingPlan(input: MarketingPlanInput): Promise<MarketingPlanAI> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(input) }] }],
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

  return JSON.parse(text) as MarketingPlanAI;
}
