import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensurePmAnnualPlanSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS pm_annual_plans (
          artist_id TEXT PRIMARY KEY,
          period_start DATE,
          period_end DATE,
          objetivo_general TEXT,
          objetivos_especificos JSONB NOT NULL DEFAULT '[]',
          cantidad_lanzamientos_proyectados INTEGER,
          metas_y_resultados TEXT,
          presupuesto_estimado NUMERIC,
          resumen_ejecutivo TEXT,
          observaciones_pm TEXT,
          observaciones_management TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_annual_plan_launches (
          id BIGSERIAL PRIMARY KEY,
          artist_id TEXT NOT NULL,
          titulo TEXT NOT NULL,
          fecha_objetivo DATE NOT NULL,
          objetivo TEXT,
          notas TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_annual_plan_launches_artist_idx ON pm_annual_plan_launches (artist_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_annual_plan_actions (
          id BIGSERIAL PRIMARY KEY,
          artist_id TEXT NOT NULL,
          launch_id BIGINT REFERENCES pm_annual_plan_launches(id) ON DELETE CASCADE,
          action_type TEXT NOT NULL,
          custom_label TEXT,
          descripcion TEXT,
          responsable TEXT,
          fecha_limite DATE,
          estado TEXT NOT NULL DEFAULT 'Pendiente',
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_annual_plan_actions_artist_idx ON pm_annual_plan_actions (artist_id)`;
      await sql`CREATE INDEX IF NOT EXISTS pm_annual_plan_actions_launch_idx ON pm_annual_plan_actions (launch_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_annual_plan_quarterly_reviews (
          id BIGSERIAL PRIMARY KEY,
          artist_id TEXT NOT NULL,
          quarter TEXT NOT NULL,
          fecha DATE,
          observaciones_pm TEXT,
          observaciones_management TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ,
          UNIQUE (artist_id, quarter)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_annual_plan_quarterly_reviews_artist_idx ON pm_annual_plan_quarterly_reviews (artist_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_annual_plan_versions (
          id BIGSERIAL PRIMARY KEY,
          artist_id TEXT NOT NULL,
          label TEXT,
          snapshot JSONB NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_annual_plan_versions_artist_idx ON pm_annual_plan_versions (artist_id, created_at DESC)`;
    })();
  }
  return ready;
}

export const ANNUAL_PLAN_ACTION_TYPES = [
  { slug: "plan_marketing", label: "Crear un plan de marketing" },
  { slug: "estrategia_contenido", label: "Definir una estrategia de contenido" },
  { slug: "sesiones_estudio", label: "Coordinar sesiones de estudio" },
  { slug: "contacto_colaboracion", label: "Contactar a un líder o referente para una colaboración" },
  { slug: "gestion_featuring", label: "Buscar y gestionar un featuring" },
  { slug: "contacto_prensa", label: "Contactar al equipo de prensa" },
  { slug: "contacto_comercial", label: "Contactar al área comercial para conseguir marcas o patrocinadores" },
  { slug: "gestion_medios", label: "Gestionar medios de comunicación" },
  { slug: "produccion_audiovisual", label: "Coordinar producción audiovisual" },
  { slug: "videoclip_contenido_redes", label: "Planificar videoclip, visualizer o contenido para redes" },
  { slug: "estrategia_playlists", label: "Crear una estrategia de playlists" },
  { slug: "branding_storytelling", label: "Trabajar branding, estética y storytelling" },
  { slug: "activaciones_shows", label: "Organizar activaciones, shows o presentaciones" },
  { slug: "personalizada", label: "Agregar una acción personalizada" },
] as const;
export type AnnualPlanActionType = (typeof ANNUAL_PLAN_ACTION_TYPES)[number]["slug"];

export const ANNUAL_PLAN_ACTION_STATUSES = ["Pendiente", "En proceso", "Realizada", "Cancelada"] as const;
export type AnnualPlanActionStatus = (typeof ANNUAL_PLAN_ACTION_STATUSES)[number];

export type AnnualPlan = {
  artistId: string;
  periodStart: string | null;
  periodEnd: string | null;
  objetivoGeneral: string | null;
  objetivosEspecificos: string[];
  cantidadLanzamientosProyectados: number | null;
  metasYResultados: string | null;
  presupuestoEstimado: number | null;
  resumenEjecutivo: string | null;
  observacionesPm: string | null;
  observacionesManagement: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type AnnualPlanLaunch = {
  id: number;
  artistId: string;
  titulo: string;
  fechaObjetivo: string;
  objetivo: string | null;
  notas: string | null;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
};

export type AnnualPlanAction = {
  id: number;
  artistId: string;
  launchId: number | null;
  actionType: string;
  customLabel: string | null;
  descripcion: string | null;
  responsable: string | null;
  fechaLimite: string | null;
  estado: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type AnnualPlanQuarterlyReview = {
  id: number;
  artistId: string;
  quarter: string;
  fecha: string | null;
  observacionesPm: string | null;
  observacionesManagement: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type AnnualPlanVersion = {
  id: number;
  artistId: string;
  label: string | null;
  createdBy: string;
  createdAt: string;
};

export type AnnualPlanVersionWithSnapshot = AnnualPlanVersion & {
  snapshot: {
    plan: AnnualPlan | null;
    launches: AnnualPlanLaunch[];
    actions: AnnualPlanAction[];
    quarterlyReviews: AnnualPlanQuarterlyReview[];
  };
};

// @vercel/postgres returns DATE columns as native Date objects, not
// strings, when read directly server-side (only JSON.stringify-ing a
// response coerces them to ISO strings automatically) — every date field
// below goes through this so callers always get the same string shape
// regardless of whether the row came straight from the DB or via an API
// response.
function toDateStr(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function rowToPlan(r: Record<string, unknown>): AnnualPlan {
  return {
    artistId: r.artist_id as string,
    periodStart: toDateStr(r.period_start),
    periodEnd: toDateStr(r.period_end),
    objetivoGeneral: (r.objetivo_general as string | null) ?? null,
    objetivosEspecificos: (r.objetivos_especificos as string[]) ?? [],
    cantidadLanzamientosProyectados: (r.cantidad_lanzamientos_proyectados as number | null) ?? null,
    metasYResultados: (r.metas_y_resultados as string | null) ?? null,
    presupuestoEstimado: r.presupuesto_estimado != null ? Number(r.presupuesto_estimado) : null,
    resumenEjecutivo: (r.resumen_ejecutivo as string | null) ?? null,
    observacionesPm: (r.observaciones_pm as string | null) ?? null,
    observacionesManagement: (r.observaciones_management as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function rowToLaunch(r: Record<string, unknown>): AnnualPlanLaunch {
  return {
    id: Number(r.id),
    artistId: r.artist_id as string,
    titulo: r.titulo as string,
    fechaObjetivo: toDateStr(r.fecha_objetivo) as string,
    objetivo: (r.objetivo as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    sortOrder: Number(r.sort_order),
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
  };
}

function rowToAction(r: Record<string, unknown>): AnnualPlanAction {
  return {
    id: Number(r.id),
    artistId: r.artist_id as string,
    launchId: r.launch_id != null ? Number(r.launch_id) : null,
    actionType: r.action_type as string,
    customLabel: (r.custom_label as string | null) ?? null,
    descripcion: (r.descripcion as string | null) ?? null,
    responsable: (r.responsable as string | null) ?? null,
    fechaLimite: toDateStr(r.fecha_limite),
    estado: r.estado as string,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function rowToQuarterlyReview(r: Record<string, unknown>): AnnualPlanQuarterlyReview {
  return {
    id: Number(r.id),
    artistId: r.artist_id as string,
    quarter: r.quarter as string,
    fecha: toDateStr(r.fecha),
    observacionesPm: (r.observaciones_pm as string | null) ?? null,
    observacionesManagement: (r.observaciones_management as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function rowToVersion(r: Record<string, unknown>): AnnualPlanVersion {
  return {
    id: Number(r.id),
    artistId: r.artist_id as string,
    label: (r.label as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
  };
}

// ---------- Plan header ----------

export async function getAnnualPlan(artistId: string): Promise<AnnualPlan | null> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`SELECT * FROM pm_annual_plans WHERE artist_id = ${artistId}`;
  return rows[0] ? rowToPlan(rows[0]) : null;
}

export async function upsertAnnualPlanHeader(
  artistId: string,
  input: {
    periodStart?: string | null; periodEnd?: string | null; objetivoGeneral?: string | null;
    objetivosEspecificos?: string[]; cantidadLanzamientosProyectados?: number | null;
    metasYResultados?: string | null; presupuestoEstimado?: number | null; resumenEjecutivo?: string | null;
    observacionesPm?: string | null;
  },
  actorEmail: string
): Promise<AnnualPlan> {
  await ensurePmAnnualPlanSchema();
  const current = await getAnnualPlan(artistId);
  const periodStart = input.periodStart !== undefined ? input.periodStart : current?.periodStart ?? null;
  const periodEnd = input.periodEnd !== undefined ? input.periodEnd : current?.periodEnd ?? null;
  const objetivoGeneral = input.objetivoGeneral !== undefined ? input.objetivoGeneral : current?.objetivoGeneral ?? null;
  const objetivosEspecificos = input.objetivosEspecificos !== undefined ? input.objetivosEspecificos : current?.objetivosEspecificos ?? [];
  const cantidadLanzamientosProyectados =
    input.cantidadLanzamientosProyectados !== undefined ? input.cantidadLanzamientosProyectados : current?.cantidadLanzamientosProyectados ?? null;
  const metasYResultados = input.metasYResultados !== undefined ? input.metasYResultados : current?.metasYResultados ?? null;
  const presupuestoEstimado = input.presupuestoEstimado !== undefined ? input.presupuestoEstimado : current?.presupuestoEstimado ?? null;
  const resumenEjecutivo = input.resumenEjecutivo !== undefined ? input.resumenEjecutivo : current?.resumenEjecutivo ?? null;
  const observacionesPm = input.observacionesPm !== undefined ? input.observacionesPm : current?.observacionesPm ?? null;
  const observacionesManagement = current?.observacionesManagement ?? null;

  const { rows } = await sql`
    INSERT INTO pm_annual_plans (
      artist_id, period_start, period_end, objetivo_general, objetivos_especificos,
      cantidad_lanzamientos_proyectados, metas_y_resultados, presupuesto_estimado, resumen_ejecutivo,
      observaciones_pm, observaciones_management, created_by, created_at, updated_by, updated_at
    )
    VALUES (
      ${artistId}, ${periodStart}, ${periodEnd}, ${objetivoGeneral}, ${JSON.stringify(objetivosEspecificos)}::jsonb,
      ${cantidadLanzamientosProyectados}, ${metasYResultados}, ${presupuestoEstimado}, ${resumenEjecutivo},
      ${observacionesPm}, ${observacionesManagement}, ${actorEmail}, now(), ${actorEmail}, now()
    )
    ON CONFLICT (artist_id) DO UPDATE SET
      period_start = EXCLUDED.period_start,
      period_end = EXCLUDED.period_end,
      objetivo_general = EXCLUDED.objetivo_general,
      objetivos_especificos = EXCLUDED.objetivos_especificos,
      cantidad_lanzamientos_proyectados = EXCLUDED.cantidad_lanzamientos_proyectados,
      metas_y_resultados = EXCLUDED.metas_y_resultados,
      presupuesto_estimado = EXCLUDED.presupuesto_estimado,
      resumen_ejecutivo = EXCLUDED.resumen_ejecutivo,
      observaciones_pm = EXCLUDED.observaciones_pm,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING *
  `;
  const plan = rowToPlan(rows[0]);
  if (!current) {
    await createVersionSnapshot(artistId, "Plan original", actorEmail);
  }
  return plan;
}

// Management-only write path — the PM-facing upsertAnnualPlanHeader above
// never touches this column (always carries the current value forward), so
// this is the one place that ever sets it. Requires the plan header to
// already exist (Management can't create a plan for a PM).
export async function updatePlanManagementNotes(
  artistId: string,
  observacionesManagement: string | null,
  actorEmail: string
): Promise<AnnualPlan | null> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    UPDATE pm_annual_plans SET observaciones_management = ${observacionesManagement}, updated_by = ${actorEmail}, updated_at = now()
    WHERE artist_id = ${artistId}
    RETURNING *
  `;
  return rows[0] ? rowToPlan(rows[0]) : null;
}

// ---------- Launches ----------

export async function listLaunches(artistId: string): Promise<AnnualPlanLaunch[]> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    SELECT * FROM pm_annual_plan_launches WHERE artist_id = ${artistId} ORDER BY fecha_objetivo ASC, sort_order ASC
  `;
  return rows.map(rowToLaunch);
}

export async function createLaunch(
  artistId: string,
  input: { titulo: string; fechaObjetivo: string; objetivo?: string | null; notas?: string | null },
  actorEmail: string
): Promise<AnnualPlanLaunch> {
  await ensurePmAnnualPlanSchema();
  const { rows: existing } = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM pm_annual_plan_launches WHERE artist_id = ${artistId}
  `;
  const nextOrder = Number(existing[0]?.max_order ?? -1) + 1;
  const { rows } = await sql`
    INSERT INTO pm_annual_plan_launches (artist_id, titulo, fecha_objetivo, objetivo, notas, sort_order, created_by)
    VALUES (${artistId}, ${input.titulo}, ${input.fechaObjetivo}, ${input.objetivo ?? null}, ${input.notas ?? null}, ${nextOrder}, ${actorEmail})
    RETURNING *
  `;
  return rowToLaunch(rows[0]);
}

export async function updateLaunch(
  id: number,
  artistId: string,
  patch: { titulo?: string; fechaObjetivo?: string; objetivo?: string | null; notas?: string | null; sortOrder?: number },
  actorEmail: string
): Promise<AnnualPlanLaunch | null> {
  await ensurePmAnnualPlanSchema();
  const { rows: currentRows } = await sql`SELECT * FROM pm_annual_plan_launches WHERE id = ${id} AND artist_id = ${artistId}`;
  if (!currentRows[0]) return null;
  const current = rowToLaunch(currentRows[0]);
  const titulo = patch.titulo ?? current.titulo;
  const fechaObjetivo = patch.fechaObjetivo ?? current.fechaObjetivo;
  const objetivo = patch.objetivo !== undefined ? patch.objetivo : current.objetivo;
  const notas = patch.notas !== undefined ? patch.notas : current.notas;
  const sortOrder = patch.sortOrder !== undefined ? patch.sortOrder : current.sortOrder;
  const { rows } = await sql`
    UPDATE pm_annual_plan_launches SET
      titulo = ${titulo}, fecha_objetivo = ${fechaObjetivo}, objetivo = ${objetivo}, notas = ${notas},
      sort_order = ${sortOrder}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} AND artist_id = ${artistId}
    RETURNING *
  `;
  return rows[0] ? rowToLaunch(rows[0]) : null;
}

export async function deleteLaunch(id: number, artistId: string): Promise<void> {
  await ensurePmAnnualPlanSchema();
  await sql`DELETE FROM pm_annual_plan_launches WHERE id = ${id} AND artist_id = ${artistId}`;
}

// ---------- Actions ----------

export async function listActions(artistId: string): Promise<AnnualPlanAction[]> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    SELECT * FROM pm_annual_plan_actions WHERE artist_id = ${artistId} ORDER BY created_at ASC
  `;
  return rows.map(rowToAction);
}

export async function createAction(
  artistId: string,
  input: { launchId: number | null; actionType: string; customLabel?: string | null; descripcion?: string | null; responsable?: string | null; fechaLimite?: string | null },
  actorEmail: string
): Promise<AnnualPlanAction> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    INSERT INTO pm_annual_plan_actions (artist_id, launch_id, action_type, custom_label, descripcion, responsable, fecha_limite, created_by)
    VALUES (${artistId}, ${input.launchId}, ${input.actionType}, ${input.customLabel ?? null}, ${input.descripcion ?? null}, ${input.responsable ?? null}, ${input.fechaLimite ?? null}, ${actorEmail})
    RETURNING *
  `;
  return rowToAction(rows[0]);
}

export async function updateAction(
  id: number,
  artistId: string,
  patch: { descripcion?: string | null; responsable?: string | null; fechaLimite?: string | null; estado?: string; customLabel?: string | null },
  actorEmail: string
): Promise<AnnualPlanAction | null> {
  await ensurePmAnnualPlanSchema();
  const { rows: currentRows } = await sql`SELECT * FROM pm_annual_plan_actions WHERE id = ${id} AND artist_id = ${artistId}`;
  if (!currentRows[0]) return null;
  const current = rowToAction(currentRows[0]);
  const descripcion = patch.descripcion !== undefined ? patch.descripcion : current.descripcion;
  const responsable = patch.responsable !== undefined ? patch.responsable : current.responsable;
  const fechaLimite = patch.fechaLimite !== undefined ? patch.fechaLimite : current.fechaLimite;
  const estado = patch.estado ?? current.estado;
  const customLabel = patch.customLabel !== undefined ? patch.customLabel : current.customLabel;
  const { rows } = await sql`
    UPDATE pm_annual_plan_actions SET
      descripcion = ${descripcion}, responsable = ${responsable}, fecha_limite = ${fechaLimite},
      estado = ${estado}, custom_label = ${customLabel}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} AND artist_id = ${artistId}
    RETURNING *
  `;
  return rows[0] ? rowToAction(rows[0]) : null;
}

export async function deleteAction(id: number, artistId: string): Promise<void> {
  await ensurePmAnnualPlanSchema();
  await sql`DELETE FROM pm_annual_plan_actions WHERE id = ${id} AND artist_id = ${artistId}`;
}

// ---------- Quarterly reviews ----------

export async function listQuarterlyReviews(artistId: string): Promise<AnnualPlanQuarterlyReview[]> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    SELECT * FROM pm_annual_plan_quarterly_reviews WHERE artist_id = ${artistId} ORDER BY quarter ASC
  `;
  return rows.map(rowToQuarterlyReview);
}

export async function upsertQuarterlyReviewPm(
  artistId: string,
  quarter: string,
  input: { fecha?: string | null; observacionesPm?: string | null },
  actorEmail: string
): Promise<AnnualPlanQuarterlyReview> {
  await ensurePmAnnualPlanSchema();
  const { rows: currentRows } = await sql`
    SELECT * FROM pm_annual_plan_quarterly_reviews WHERE artist_id = ${artistId} AND quarter = ${quarter}
  `;
  const current = currentRows[0] ? rowToQuarterlyReview(currentRows[0]) : null;
  const fecha = input.fecha !== undefined ? input.fecha : current?.fecha ?? null;
  const observacionesPm = input.observacionesPm !== undefined ? input.observacionesPm : current?.observacionesPm ?? null;
  const observacionesManagement = current?.observacionesManagement ?? null;
  const { rows } = await sql`
    INSERT INTO pm_annual_plan_quarterly_reviews (artist_id, quarter, fecha, observaciones_pm, observaciones_management, created_by)
    VALUES (${artistId}, ${quarter}, ${fecha}, ${observacionesPm}, ${observacionesManagement}, ${actorEmail})
    ON CONFLICT (artist_id, quarter) DO UPDATE SET
      fecha = EXCLUDED.fecha, observaciones_pm = EXCLUDED.observaciones_pm,
      updated_by = ${actorEmail}, updated_at = now()
    RETURNING *
  `;
  const review = rowToQuarterlyReview(rows[0]);
  await createVersionSnapshot(artistId, `Revisión ${quarter}`, actorEmail);
  return review;
}

export async function updateQuarterlyReviewManagementNotes(
  artistId: string,
  quarter: string,
  observacionesManagement: string | null,
  actorEmail: string
): Promise<AnnualPlanQuarterlyReview | null> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    INSERT INTO pm_annual_plan_quarterly_reviews (artist_id, quarter, observaciones_management, created_by)
    VALUES (${artistId}, ${quarter}, ${observacionesManagement}, ${actorEmail})
    ON CONFLICT (artist_id, quarter) DO UPDATE SET
      observaciones_management = EXCLUDED.observaciones_management,
      updated_by = ${actorEmail}, updated_at = now()
    RETURNING *
  `;
  return rows[0] ? rowToQuarterlyReview(rows[0]) : null;
}

// ---------- Version history ----------

async function createVersionSnapshot(artistId: string, label: string | null, actorEmail: string): Promise<AnnualPlanVersion> {
  const [plan, launches, actions, quarterlyReviews] = await Promise.all([
    getAnnualPlan(artistId),
    listLaunches(artistId),
    listActions(artistId),
    listQuarterlyReviews(artistId),
  ]);
  const snapshot = { plan, launches, actions, quarterlyReviews };
  const { rows } = await sql`
    INSERT INTO pm_annual_plan_versions (artist_id, label, snapshot, created_by)
    VALUES (${artistId}, ${label}, ${JSON.stringify(snapshot)}::jsonb, ${actorEmail})
    RETURNING id, artist_id, label, created_by, created_at
  `;
  return rowToVersion(rows[0]);
}

export async function listVersions(artistId: string): Promise<AnnualPlanVersion[]> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    SELECT id, artist_id, label, created_by, created_at FROM pm_annual_plan_versions
    WHERE artist_id = ${artistId} ORDER BY created_at DESC
  `;
  return rows.map(rowToVersion);
}

export async function getVersion(id: number, artistId: string): Promise<AnnualPlanVersionWithSnapshot | null> {
  await ensurePmAnnualPlanSchema();
  const { rows } = await sql`
    SELECT * FROM pm_annual_plan_versions WHERE id = ${id} AND artist_id = ${artistId}
  `;
  if (!rows[0]) return null;
  return { ...rowToVersion(rows[0]), snapshot: rows[0].snapshot as AnnualPlanVersionWithSnapshot["snapshot"] };
}

// ---------- Derived launch status/responsables ----------

export function computeLaunchStatus(actions: AnnualPlanAction[]): string {
  if (actions.length === 0) return "Pendiente";
  const estados = new Set(actions.map((a) => a.estado));
  if (estados.size === 1) {
    const only = [...estados][0];
    if (only === "Realizada") return "Completado";
    if (only === "Cancelada") return "Cancelada";
    if (only === "Pendiente") return "Pendiente";
    return "En proceso";
  }
  if ([...estados].some((e) => e === "Cancelada") && [...estados].some((e) => e === "Realizada")) {
    return "Con acciones canceladas";
  }
  return "En proceso";
}

export function computeLaunchResponsables(actions: AnnualPlanAction[]): string[] {
  const set = new Set<string>();
  for (const a of actions) if (a.responsable) set.add(a.responsable);
  return [...set];
}
