import { sql } from "@vercel/postgres";
import { recordAudit } from "@/lib/db/users";

let ready: Promise<void> | null = null;

// "A&R le pone un pendiente al PM responsable de este artista" — mismo
// mecanismo exacto que lib/db/cmMaterialRequests.ts / legalPendingTasks.ts /
// publishingPendingTasks.ts / managementPendingTasks.ts, tabla propia —
// mismo criterio "own module, own tables" ya usado en todo el resto de
// la app.
export function ensureArPendingTasksSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ar_pending_tasks (
          id TEXT PRIMARY KEY,
          artist_id TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          target_pms TEXT[] NOT NULL,
          requested_by TEXT NOT NULL,
          titulo TEXT NOT NULL,
          descripcion TEXT,
          status TEXT NOT NULL DEFAULT 'Pendiente',
          pm_response TEXT,
          responded_by TEXT,
          responded_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS ar_pending_tasks_artist_idx ON ar_pending_tasks (artist_id)`;
      await sql`CREATE INDEX IF NOT EXISTS ar_pending_tasks_pms_idx ON ar_pending_tasks USING GIN (target_pms)`;
      await sql`CREATE INDEX IF NOT EXISTS ar_pending_tasks_status_idx ON ar_pending_tasks (status)`;
    })();
  }
  return ready;
}

export type ArPendingTask = {
  id: string;
  artistId: string;
  artistName: string;
  targetPms: string[];
  requestedBy: string;
  titulo: string;
  descripcion: string | null;
  status: "Pendiente" | "Resuelto";
  pmResponse: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToTask(r: Record<string, unknown>): ArPendingTask {
  return {
    id: r.id as string,
    artistId: r.artist_id as string,
    artistName: r.artist_name as string,
    targetPms: (r.target_pms as string[]) ?? [],
    requestedBy: r.requested_by as string,
    titulo: r.titulo as string,
    descripcion: (r.descripcion as string) ?? null,
    status: r.status as "Pendiente" | "Resuelto",
    pmResponse: (r.pm_response as string) ?? null,
    respondedBy: (r.responded_by as string) ?? null,
    respondedAt: (r.responded_at as string) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  };
}

// @vercel/postgres's sql`` typings only accept Primitive (no arrays), aunque
// el driver real sí manda un array de Postgres — mismo workaround que
// lib/db/cmMaterialRequests.ts y siblings.
function arrayParam<T>(items: T[]): string {
  return items as unknown as string;
}

export async function createPendingTask(input: {
  artistId: string;
  artistName: string;
  targetPms: string[];
  titulo: string;
  descripcion: string | null;
  actorEmail: string;
}): Promise<ArPendingTask> {
  await ensureArPendingTasksSchema();
  const id = `apt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO ar_pending_tasks
      (id, artist_id, artist_name, target_pms, requested_by, titulo, descripcion, status)
    VALUES
      (${id}, ${input.artistId}, ${input.artistName}, ${arrayParam(input.targetPms)}::text[],
       ${input.actorEmail}, ${input.titulo}, ${input.descripcion}, 'Pendiente')
    RETURNING *
  `;
  const task = rowToTask(rows[0]);
  await recordAudit({
    actorEmail: input.actorEmail,
    action: "ar_pending_task_created",
    entityType: "ar_pending_task",
    entityId: task.id,
    after: { artistName: task.artistName, targetPms: task.targetPms, titulo: task.titulo },
  });
  return task;
}

export async function getPendingTask(id: string): Promise<ArPendingTask | null> {
  await ensureArPendingTasksSchema();
  const { rows } = await sql`SELECT * FROM ar_pending_tasks WHERE id = ${id}`;
  return rows[0] ? rowToTask(rows[0]) : null;
}

export async function listTasksForArtist(artistId: string): Promise<ArPendingTask[]> {
  await ensureArPendingTasksSchema();
  const { rows } = await sql`
    SELECT * FROM ar_pending_tasks WHERE artist_id = ${artistId} ORDER BY created_at DESC
  `;
  return rows.map(rowToTask);
}

export async function listTasksForPm(pmEmail: string, opts?: { status?: "Pendiente" | "Resuelto" }): Promise<ArPendingTask[]> {
  await ensureArPendingTasksSchema();
  const { rows } = opts?.status
    ? await sql`
        SELECT * FROM ar_pending_tasks
        WHERE ${pmEmail} = ANY(target_pms) AND status = ${opts.status}
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT * FROM ar_pending_tasks
        WHERE ${pmEmail} = ANY(target_pms)
        ORDER BY created_at DESC
      `;
  return rows.map(rowToTask);
}

// Cualquiera de los PM apuntados puede responder — el primero que lo hace
// resuelve el pendiente para todos (WHERE status='Pendiente' evita una
// respuesta doble en carrera).
export async function respondToTask(id: string, response: string, actorEmail: string): Promise<ArPendingTask | null> {
  await ensureArPendingTasksSchema();
  const { rows } = await sql`
    UPDATE ar_pending_tasks
    SET status = 'Resuelto', pm_response = ${response}, responded_by = ${actorEmail}, responded_at = now(),
        updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} AND status = 'Pendiente'
    RETURNING *
  `;
  const task = rows[0] ? rowToTask(rows[0]) : null;
  if (task) {
    await recordAudit({
      actorEmail,
      action: "ar_pending_task_resolved",
      entityType: "ar_pending_task",
      entityId: id,
      before: { status: "Pendiente" },
      after: { status: "Resuelto", pmResponse: response },
    });
  }
  return task;
}
