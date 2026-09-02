import { sql } from "@vercel/postgres";
import { ensureCmAccountsSchema } from "@/lib/db/cmAccounts";
import { ensureCmContentSchema } from "@/lib/db/cmContent";

function arrayParam<T>(items: T[]): string | number | boolean {
  return items as unknown as string;
}

// Carga manual de números — no hay API gratuita de Instagram/TikTok
// disponible (mismo hallazgo ya documentado en lib/db/arGenreTrends.ts para
// A&R), y YouTube queda para una integración real futura. Mismo shape que
// lib/db/listeners.ts (artist_listeners_daily): una fila por (entidad, día),
// UNIQUE para poder recargar el mismo día sin duplicar.

let ready: Promise<void> | null = null;

export function ensureCmMetricsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureCmAccountsSchema();
      await ensureCmContentSchema();
      await sql`
        CREATE TABLE IF NOT EXISTS cm_account_metrics_daily (
          id BIGSERIAL PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES cm_accounts(id) ON DELETE CASCADE,
          measured_at DATE NOT NULL,
          seguidores INTEGER,
          alcance INTEGER,
          impresiones INTEGER,
          reproducciones INTEGER,
          interacciones INTEGER,
          me_gusta INTEGER,
          comentarios INTEGER,
          compartidos INTEGER,
          guardados INTEGER,
          tiempo_reproduccion INTEGER,
          retencion_pct NUMERIC,
          clics INTEGER,
          entered_by TEXT NOT NULL,
          entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (account_id, measured_at)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS cm_content_item_metrics (
          id BIGSERIAL PRIMARY KEY,
          content_item_id BIGINT NOT NULL REFERENCES cm_content_items(id) ON DELETE CASCADE,
          measured_at DATE NOT NULL,
          views INTEGER,
          retencion_pct NUMERIC,
          subs_generados INTEGER,
          me_gusta INTEGER,
          comentarios INTEGER,
          compartidos INTEGER,
          tiempo_reproduccion INTEGER,
          entered_by TEXT NOT NULL,
          entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (content_item_id, measured_at)
        )
      `;
    })();
  }
  return ready;
}

export async function upsertAccountMetrics(input: {
  accountId: string;
  measuredAt: string;
  seguidores: number | null; alcance: number | null; impresiones: number | null; reproducciones: number | null;
  interacciones: number | null; meGusta: number | null; comentarios: number | null; compartidos: number | null;
  guardados: number | null; tiempoReproduccion: number | null; retencionPct: number | null; clics: number | null;
  enteredBy: string;
}): Promise<void> {
  await ensureCmMetricsSchema();
  await sql`
    INSERT INTO cm_account_metrics_daily
      (account_id, measured_at, seguidores, alcance, impresiones, reproducciones, interacciones, me_gusta, comentarios, compartidos, guardados, tiempo_reproduccion, retencion_pct, clics, entered_by)
    VALUES
      (${input.accountId}, ${input.measuredAt}, ${input.seguidores}, ${input.alcance}, ${input.impresiones}, ${input.reproducciones},
       ${input.interacciones}, ${input.meGusta}, ${input.comentarios}, ${input.compartidos}, ${input.guardados}, ${input.tiempoReproduccion},
       ${input.retencionPct}, ${input.clics}, ${input.enteredBy})
    ON CONFLICT (account_id, measured_at) DO UPDATE SET
      seguidores = EXCLUDED.seguidores, alcance = EXCLUDED.alcance, impresiones = EXCLUDED.impresiones, reproducciones = EXCLUDED.reproducciones,
      interacciones = EXCLUDED.interacciones, me_gusta = EXCLUDED.me_gusta, comentarios = EXCLUDED.comentarios, compartidos = EXCLUDED.compartidos,
      guardados = EXCLUDED.guardados, tiempo_reproduccion = EXCLUDED.tiempo_reproduccion, retencion_pct = EXCLUDED.retencion_pct, clics = EXCLUDED.clics,
      entered_by = EXCLUDED.entered_by, entered_at = now()
  `;
}

export async function upsertContentItemMetrics(input: {
  contentItemId: number;
  measuredAt: string;
  views: number | null; retencionPct: number | null; subsGenerados: number | null; meGusta: number | null;
  comentarios: number | null; compartidos: number | null; tiempoReproduccion: number | null;
  enteredBy: string;
}): Promise<void> {
  await ensureCmMetricsSchema();
  await sql`
    INSERT INTO cm_content_item_metrics
      (content_item_id, measured_at, views, retencion_pct, subs_generados, me_gusta, comentarios, compartidos, tiempo_reproduccion, entered_by)
    VALUES
      (${input.contentItemId}, ${input.measuredAt}, ${input.views}, ${input.retencionPct}, ${input.subsGenerados}, ${input.meGusta},
       ${input.comentarios}, ${input.compartidos}, ${input.tiempoReproduccion}, ${input.enteredBy})
    ON CONFLICT (content_item_id, measured_at) DO UPDATE SET
      views = EXCLUDED.views, retencion_pct = EXCLUDED.retencion_pct, subs_generados = EXCLUDED.subs_generados, me_gusta = EXCLUDED.me_gusta,
      comentarios = EXCLUDED.comentarios, compartidos = EXCLUDED.compartidos, tiempo_reproduccion = EXCLUDED.tiempo_reproduccion,
      entered_by = EXCLUDED.entered_by, entered_at = now()
  `;
}

export async function getAccountMetricsHistory(accountId: string, limit = 90) {
  await ensureCmMetricsSchema();
  const { rows } = await sql`
    SELECT * FROM cm_account_metrics_daily WHERE account_id = ${accountId} ORDER BY measured_at DESC LIMIT ${limit}
  `;
  return rows;
}

// Última medición + deltas de 7/30 días — mismo patrón DISTINCT ON +
// subquery correlacionada que getRankingLatest() en lib/db/listeners.ts.
export async function getAccountGrowth(accountId: string) {
  await ensureCmMetricsSchema();
  const { rows } = await sql`
    WITH latest AS (
      SELECT DISTINCT ON (account_id) *
      FROM cm_account_metrics_daily
      WHERE account_id = ${accountId}
      ORDER BY account_id, measured_at DESC
    )
    SELECT
      l.*,
      (SELECT seguidores FROM cm_account_metrics_daily d WHERE d.account_id = l.account_id AND d.measured_at <= l.measured_at - INTERVAL '7 day' ORDER BY d.measured_at DESC LIMIT 1) AS seguidores_hace_7d,
      (SELECT seguidores FROM cm_account_metrics_daily d WHERE d.account_id = l.account_id AND d.measured_at <= l.measured_at - INTERVAL '30 day' ORDER BY d.measured_at DESC LIMIT 1) AS seguidores_hace_30d
    FROM latest l
  `;
  return rows[0] ?? null;
}

export async function getContentItemMetricsHistory(contentItemId: number) {
  await ensureCmMetricsSchema();
  const { rows } = await sql`
    SELECT * FROM cm_content_item_metrics WHERE content_item_id = ${contentItemId} ORDER BY measured_at ASC
  `;
  return rows;
}

// Mejor contenido reciente por una métrica real — usado tanto por la
// portada del módulo como por el motor de sugerencias (Fase 5).
export type ContentMetric = "views" | "retencion_pct" | "compartidos" | "subs_generados";

// Una consulta literal por métrica en vez de interpolar el nombre de
// columna — @vercel/postgres no expone un sql.unsafe()/sql.query() para SQL
// crudo, y ningún otro archivo de este repo interpola un identificador
// dinámico (siempre valores), así que esto sigue esa misma convención.
// sql`` ejecuta cada template de inmediato (no arma fragmentos componibles
// como Neon/postgres.js) — confirmado leyendo sqlTemplate() en
// node_modules/@vercel/postgres, así que acá van 4 queries completas e
// independientes en vez de intentar interpolar un nombre de columna o un
// fragmento reusable.
export async function getTopContentByMetric(accountIds: string[], metric: ContentMetric, limit = 10) {
  await ensureCmMetricsSchema();
  if (accountIds.length === 0) return [];
  if (metric === "views") {
    const { rows } = await sql`
      SELECT ci.*, m.measured_at, m.views, m.retencion_pct, m.compartidos, m.subs_generados
      FROM cm_content_item_metrics m JOIN cm_content_items ci ON ci.id = m.content_item_id
      WHERE ci.account_id = ANY(${arrayParam(accountIds)}::text[]) ORDER BY m.views DESC NULLS LAST LIMIT ${limit}
    `;
    return rows;
  }
  if (metric === "retencion_pct") {
    const { rows } = await sql`
      SELECT ci.*, m.measured_at, m.views, m.retencion_pct, m.compartidos, m.subs_generados
      FROM cm_content_item_metrics m JOIN cm_content_items ci ON ci.id = m.content_item_id
      WHERE ci.account_id = ANY(${arrayParam(accountIds)}::text[]) ORDER BY m.retencion_pct DESC NULLS LAST LIMIT ${limit}
    `;
    return rows;
  }
  if (metric === "compartidos") {
    const { rows } = await sql`
      SELECT ci.*, m.measured_at, m.views, m.retencion_pct, m.compartidos, m.subs_generados
      FROM cm_content_item_metrics m JOIN cm_content_items ci ON ci.id = m.content_item_id
      WHERE ci.account_id = ANY(${arrayParam(accountIds)}::text[]) ORDER BY m.compartidos DESC NULLS LAST LIMIT ${limit}
    `;
    return rows;
  }
  const { rows } = await sql`
    SELECT ci.*, m.measured_at, m.views, m.retencion_pct, m.compartidos, m.subs_generados
    FROM cm_content_item_metrics m JOIN cm_content_items ci ON ci.id = m.content_item_id
    WHERE ci.account_id = ANY(${arrayParam(accountIds)}::text[]) ORDER BY m.subs_generados DESC NULLS LAST LIMIT ${limit}
  `;
  return rows;
}
