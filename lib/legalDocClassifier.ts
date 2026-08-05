// Reads a signed DocuSign document (as the AI would, the same way a human
// at Legal would skim it) and decides two things: is it actually signed
// (not a draft/template), and which of our three legal destinations it
// belongs in — a general artist contract, a per-song collaboration release,
// or something involving an artist outside our own roster entirely.
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
// Full "flash" (thinking-capable), not "flash-lite" — this is a judgment
// call (draft vs. fully executed, which of three destinations fits) closer
// to open reasoning than the bounded, schema-constrained generation the
// lite model is used for elsewhere in this codebase.
const MODEL = "gemini-flash-latest";

export type DocClassification = {
  firmado: boolean;
  evidenciaFirma: string;
  destino: "contrato_general" | "release_cancion" | "externo" | "no_reconocido";
  artistaPrincipal: string | null;
  tipoContrato: "Editorial" | "Intérprete" | "Representación" | null;
  fonograma: string | null;
  featuring: string | null;
  contraparte: string | null;
  fechaFirma: string | null;
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    firmado: { type: "BOOLEAN" },
    evidenciaFirma: { type: "STRING" },
    destino: { type: "STRING", enum: ["contrato_general", "release_cancion", "externo", "no_reconocido"] },
    artistaPrincipal: { type: "STRING", nullable: true },
    tipoContrato: { type: "STRING", enum: ["Editorial", "Intérprete", "Representación", ""] },
    fonograma: { type: "STRING", nullable: true },
    featuring: { type: "STRING", nullable: true },
    contraparte: { type: "STRING", nullable: true },
    fechaFirma: { type: "STRING", nullable: true },
  },
  required: ["firmado", "evidenciaFirma", "destino", "tipoContrato"],
};

function buildPrompt(envelopeSubject: string, rosterNames: string[]): string {
  return `Sos un asistente legal que clasifica documentos ya firmados en DocuSign para un sello discográfico, para archivarlos automáticamente en el sistema correcto.

ASUNTO DEL ENVELOPE EN DOCUSIGN: "${envelopeSubject}"

NUESTRO ROSTER DE ARTISTAS PROPIOS (nombres exactos tal como deben usarse — si el documento menciona a alguno de estos, copiá el nombre EXACTAMENTE como aparece en esta lista, no como aparece en el documento):
${rosterNames.join(", ")}

INSTRUCCIONES:

1. FIRMADO: determiná si el documento muestra evidencia CLARA de estar completamente firmado (no un borrador ni una plantilla). Buscá: certificado de auditoría de DocuSign/AdobeSign con texto tipo "Estado: Firmado" o "Documento completado", sellos de firma con fecha y hora, o un ID de transacción de finalización. Si el documento dice "DRAFT", "BORRADOR", "MODELO", o solo tiene un bloque de firma vacío sin fecha ni certificado, es firmado=false. Ante la duda, false.

2. DESTINO — elegí uno:
   - "contrato_general": es un contrato general de un artista de nuestro roster (Editorial, Intérprete o Representación), no atado a una canción puntual.
   - "release_cancion": es un acuerdo de colaboración/participación para UNA canción específica, entre un artista de nuestro roster y un invitado/featuring.
   - "externo": el documento no involucra a ningún artista de nuestro roster (por ejemplo, es un contrato de otra empresa, u otro artista que no está en la lista).
   - "no_reconocido": no podés determinar con confianza de qué se trata.

3. ARTISTA PRINCIPAL: si identificás a alguien de nuestro roster, copiá su nombre EXACTO de la lista de arriba. Si no hay ninguno, dejalo null.

4. TIPO DE CONTRATO: solo si destino="contrato_general" — Editorial, Intérprete o Representación según el contenido. Si no aplica, dejalo como string vacío.

5. FONOGRAMA: nombre de la canción, si el documento menciona una puntual (típico en release_cancion).

6. FEATURING: nombre del artista invitado/colaborador (el que NO es de nuestro roster), si aplica.

7. CONTRAPARTE: la otra parte firmante del contrato (persona o empresa), si es distinta del artista principal.

8. FECHA DE FIRMA: fecha en formato YYYY-MM-DD si la evidencia de firma la muestra explícitamente. Si no está clara, null.

Respondé únicamente con el JSON solicitado.`;
}

export async function classifyDocusignDocument(
  pdfBase64: string,
  envelopeSubject: string,
  rosterNames: string[]
): Promise<DocClassification> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");

  const res = await fetch(`${GEMINI_API}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: buildPrompt(envelopeSubject, rosterNames) },
          ],
        },
      ],
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

  const parsed = JSON.parse(text) as Omit<DocClassification, "tipoContrato"> & { tipoContrato: string };
  return {
    ...parsed,
    tipoContrato: (["Editorial", "Intérprete", "Representación"] as const).includes(
      parsed.tipoContrato as "Editorial" | "Intérprete" | "Representación"
    )
      ? (parsed.tipoContrato as "Editorial" | "Intérprete" | "Representación")
      : null,
  };
}
