import { sql } from "@vercel/postgres";
import { ensureSettingsSchema } from "./settings";

// Persona y estado en vivo del agente de A&R, sobre app_settings (mismo
// patrón JSON-por-key que spotifySettings.ts) — cero tablas nuevas para
// esto, coherente con cómo ya se guardan otras configuraciones globales del
// sello.
const PERSONA_KEY = "ar_agent_persona";
const STATUS_KEY = "ar_agent_status";

export type ArAgentPersona = {
  name: string;
  avatarUrl: string | null;
  tone: string;
  description: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

const DEFAULT_PERSONA: ArAgentPersona = {
  name: "Nova",
  avatarUrl: null,
  tone: "directo, curioso y estratégico",
  description: "Director de A&R virtual del sello — investiga el catálogo y el roster propio y sugiere acciones concretas.",
  updatedBy: null,
  updatedAt: null,
};

export async function getAgentPersona(): Promise<ArAgentPersona> {
  await ensureSettingsSchema();
  const { rows } = await sql`SELECT value FROM app_settings WHERE key = ${PERSONA_KEY}`;
  const raw = rows[0]?.value as string | undefined;
  if (!raw) return DEFAULT_PERSONA;
  try {
    return { ...DEFAULT_PERSONA, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PERSONA;
  }
}

export async function setAgentPersona(
  input: { name: string; avatarUrl: string | null; tone: string; description: string },
  actorEmail: string
): Promise<ArAgentPersona> {
  await ensureSettingsSchema();
  const persona: ArAgentPersona = { ...input, updatedBy: actorEmail, updatedAt: new Date().toISOString() };
  const value = JSON.stringify(persona);
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${PERSONA_KEY}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
  return persona;
}

export type ArAgentState = "idle" | "scanning_roster" | "scanning_catalog" | "detectando_alertas" | "preparando_resumen";

export type ArAgentStatus = {
  state: ArAgentState;
  detail: string | null;
  updatedAt: string;
};

const DEFAULT_STATUS: ArAgentStatus = { state: "idle", detail: null, updatedAt: new Date(0).toISOString() };

export async function getAgentStatus(): Promise<ArAgentStatus> {
  await ensureSettingsSchema();
  const { rows } = await sql`SELECT value FROM app_settings WHERE key = ${STATUS_KEY}`;
  const raw = rows[0]?.value as string | undefined;
  if (!raw) return DEFAULT_STATUS;
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STATUS;
  }
}

// Llamado por el cron (app/api/cron/ar-scan) en cada transición real de
// fase — nunca inventado, siempre refleja lo que esa corrida está haciendo
// en ese momento.
export async function setAgentStatus(state: ArAgentState, detail: string | null): Promise<void> {
  await ensureSettingsSchema();
  const status: ArAgentStatus = { state, detail, updatedAt: new Date().toISOString() };
  const value = JSON.stringify(status);
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${STATUS_KEY}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
}
