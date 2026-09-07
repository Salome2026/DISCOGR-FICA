import { sql } from "@vercel/postgres";
import { ensureSettingsSchema } from "./settings";

// Documento de criterios de scouting, editable por el equipo de A&R — mismo
// patrón JSON-sobre-app_settings que persona/umbrales del agente. Es la
// vara real contra la que se evalúa un candidato externo en
// lib/arScouting.ts — nunca se inventa un criterio que no esté acá.
const CRITERIA_KEY = "ar_scouting_criteria";

const DEFAULT_TEXT =
  "No buscamos solo números. Buscamos identidad, potencial de carrera, proyección, " +
  "comunidad real (aunque sea chica) y resultados concretos aunque todavía sean " +
  "pequeños. Un artista con pocos oyentes pero una identidad fuerte y una comunidad " +
  "que responde vale más que un número grande sin narrativa.";

export type ArScoutingCriteria = {
  text: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export async function getScoutingCriteria(): Promise<ArScoutingCriteria> {
  await ensureSettingsSchema();
  const { rows } = await sql`SELECT value FROM app_settings WHERE key = ${CRITERIA_KEY}`;
  const raw = rows[0]?.value as string | undefined;
  if (!raw) return { text: DEFAULT_TEXT, updatedBy: null, updatedAt: null };
  try {
    const parsed = JSON.parse(raw);
    return { text: parsed.text || DEFAULT_TEXT, updatedBy: parsed.updatedBy ?? null, updatedAt: parsed.updatedAt ?? null };
  } catch {
    return { text: DEFAULT_TEXT, updatedBy: null, updatedAt: null };
  }
}

export async function setScoutingCriteria(text: string, actorEmail: string): Promise<ArScoutingCriteria> {
  await ensureSettingsSchema();
  const criteria: ArScoutingCriteria = { text, updatedBy: actorEmail, updatedAt: new Date().toISOString() };
  const value = JSON.stringify(criteria);
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${CRITERIA_KEY}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
  return criteria;
}
