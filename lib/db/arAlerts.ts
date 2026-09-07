import { sql } from "@vercel/postgres";
import { ensureSettingsSchema } from "./settings";

// Capa fina de notificación sobre señales que las fases anteriores de A&R ya
// detectan (crecimiento del roster, revival de catálogo, tendencias de
// género) más dos detectores propios nuevos (productor repetido, artista
// estancado) — nada de esto reemplaza a ar_opportunities, es una alerta
// puntual sobre algo que ya está pasando ahí.
let ready: Promise<void> | null = null;

export function ensureArAlertsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ar_alerts (
          id BIGSERIAL PRIMARY KEY,
          opportunity_id TEXT REFERENCES ar_opportunities(id) ON DELETE CASCADE,
          alert_type TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'info',
          message TEXT NOT NULL,
          -- Identifica la condición real detrás de la alerta (ej.
          -- "producer_repeat:DJ Fulano") para no crear una fila nueva cada
          -- vez que corre el cron mientras la misma condición sigue vigente
          -- y sin reconocer — se vuelve a alertar recién cuando la anterior
          -- ya se marcó como vista.
          dedupe_key TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          acknowledged_by TEXT,
          acknowledged_at TIMESTAMPTZ
        )
      `;
      // Único (no solo un índice de lectura) — es lo que hace el dedupe
      // atómico más abajo: dos llamadas concurrentes con la misma dedupeKey
      // ya no pueden colarse las dos antes de que cualquiera confirme.
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS ar_alerts_unacked_idx ON ar_alerts (dedupe_key) WHERE acknowledged_at IS NULL`;
      await sql`CREATE INDEX IF NOT EXISTS ar_alerts_created_idx ON ar_alerts (created_at DESC)`;
    })();
  }
  return ready;
}

export type ArAlertSeverity = "info" | "warning";
export type ArAlertType =
  | "genre_trending"
  | "artist_exploding"
  | "producer_repeat"
  | "catalog_track_relevant"
  | "stalled_artist";

export type ArAlert = {
  id: number;
  opportunityId: string | null;
  alertType: ArAlertType;
  severity: ArAlertSeverity;
  message: string;
  createdAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
};

function rowToAlert(r: Record<string, unknown>): ArAlert {
  return {
    id: Number(r.id),
    opportunityId: (r.opportunity_id as string | null) ?? null,
    alertType: r.alert_type as ArAlertType,
    severity: r.severity as ArAlertSeverity,
    message: r.message as string,
    createdAt: r.created_at as string,
    acknowledgedBy: (r.acknowledged_by as string | null) ?? null,
    acknowledgedAt: (r.acknowledged_at as string | null) ?? null,
  };
}

// No crea una fila nueva si ya hay una alerta SIN reconocer con la misma
// dedupeKey — así un cron diario no reescribe la misma condición todos los
// días, y recién se vuelve a alertar cuando la anterior ya se marcó como
// vista. Atómico vía el índice único parcial de arriba (ON CONFLICT ...
// DO NOTHING), no un SELECT-luego-INSERT — dos llamadas concurrentes con la
// misma dedupeKey (dos corridas del cron pisadas, un doble click) no pueden
// colarse las dos. Devuelve null cuando se saltea por duplicado (no es un
// error del caller).
export async function createAlertIfNew(input: {
  opportunityId?: string | null;
  alertType: ArAlertType;
  severity?: ArAlertSeverity;
  message: string;
  dedupeKey: string;
}): Promise<ArAlert | null> {
  await ensureArAlertsSchema();
  const { rows } = await sql`
    INSERT INTO ar_alerts (opportunity_id, alert_type, severity, message, dedupe_key)
    VALUES (${input.opportunityId ?? null}, ${input.alertType}, ${input.severity ?? "info"}, ${input.message}, ${input.dedupeKey})
    ON CONFLICT (dedupe_key) WHERE acknowledged_at IS NULL DO NOTHING
    RETURNING *
  `;
  return rows[0] ? rowToAlert(rows[0]) : null;
}

export async function listAlerts(opts?: { includeAcknowledged?: boolean }): Promise<ArAlert[]> {
  await ensureArAlertsSchema();
  const { rows } = opts?.includeAcknowledged
    ? await sql`SELECT * FROM ar_alerts ORDER BY created_at DESC LIMIT 200`
    : await sql`SELECT * FROM ar_alerts WHERE acknowledged_at IS NULL ORDER BY created_at DESC LIMIT 200`;
  return rows.map(rowToAlert);
}

export async function countUnacknowledgedAlerts(): Promise<number> {
  await ensureArAlertsSchema();
  const { rows } = await sql`SELECT count(*)::int AS c FROM ar_alerts WHERE acknowledged_at IS NULL`;
  return (rows[0]?.c as number) ?? 0;
}

export async function acknowledgeAlert(id: number, actorEmail: string): Promise<ArAlert | null> {
  await ensureArAlertsSchema();
  const { rows } = await sql`
    UPDATE ar_alerts SET acknowledged_by = ${actorEmail}, acknowledged_at = now()
    WHERE id = ${id} AND acknowledged_at IS NULL
    RETURNING *
  `;
  return rows[0] ? rowToAlert(rows[0]) : null;
}

// Umbrales sobre app_settings, mismo patrón que persona/estado del agente —
// con defaults retrocompatibles si nadie los tocó nunca.
const THRESHOLDS_KEY = "ar_alert_thresholds";

export type ArAlertThresholds = {
  explodingGrowthPct: number;
  producerRepeatMinArtists: number;
  producerRepeatWindowDays: number;
  stalledMinDaysSinceRelease: number;
};

const DEFAULT_THRESHOLDS: ArAlertThresholds = {
  explodingGrowthPct: 0.25,
  producerRepeatMinArtists: 2,
  producerRepeatWindowDays: 180,
  stalledMinDaysSinceRelease: 180,
};

export async function getAlertThresholds(): Promise<ArAlertThresholds> {
  await ensureSettingsSchema();
  const { rows } = await sql`SELECT value FROM app_settings WHERE key = ${THRESHOLDS_KEY}`;
  const raw = rows[0]?.value as string | undefined;
  if (!raw) return DEFAULT_THRESHOLDS;
  try {
    return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export async function setAlertThresholds(input: ArAlertThresholds): Promise<ArAlertThresholds> {
  await ensureSettingsSchema();
  const value = JSON.stringify(input);
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${THRESHOLDS_KEY}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
  return input;
}
