// Gemini integration for the AI-generated marketing plan. Uses the raw REST
// API (no SDK) with a fixed JSON response schema so the output can be
// dropped straight into the PDF template without parsing freeform text.

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
};

export type MarketingPlanAI = {
  resumenEstrategico: string;
  secciones: { titulo: string; parrafo: string; bullets: string[] }[];
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
          parrafo: { type: "STRING" },
          bullets: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["titulo", "parrafo", "bullets"],
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
  required: ["resumenEstrategico", "secciones", "kpis"],
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

  return `Sos un estratega senior de marketing musical especializado en el mercado argentino/latinoamericano. Generá un plan de marketing personalizado, concreto y accionable para el siguiente lanzamiento — nada de texto genérico de IA, nada de relleno. Cada bullet tiene que ser una acción específica que un equipo pueda ejecutar directamente, no un consejo abstracto.

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

INSTRUCCIONES
- Si hay presupuesto, las acciones pagas deben ser realistas para ese monto exacto en pesos argentinos (no propongas campañas de pauta desproporcionadas a lo que el presupuesto permite).
- Si NO hay presupuesto, el plan debe ser 100% orgánico y no debe mencionar pauta paga en ningún punto.
- Si hay featuring, incluí al menos una sección o varios bullets sobre campañas cruzadas, públicos compartidos y regiones de afinidad conjunta entre ambos artistas.
- Usá las ciudades/países de mayor audiencia (si están disponibles) para sugerir foco geográfico concreto en la estrategia.
- Si el artista tiene lanzamientos previos en el sello, referite a ese historial para dar continuidad a la estrategia (qué funcionó, qué construir sobre eso) en vez de tratarlo como debut.
- Incluí como mínimo estas secciones, adaptadas específicamente a este género y este artista (no genéricas): Estrategia de pre-save, Cronograma de lanzamiento, Calendario de contenidos, Ideas de contenido para Reels/TikTok/Shorts, Estrategia de Spotify, Generación de UGC, Playlisting orgánico${input.presupuesto.tiene ? ", Plan de pauta paga (acorde al presupuesto)" : ""}.
- Escribí todo en español rioplatense, tono profesional pero directo, como si lo hubiera preparado un equipo de marketing musical real.
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
