import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

const DEFAULTS = ["La Juntada de los Artistas", "Sin Guion", "Para el Mundo", "Rock & Show"];

export function ensureStreamingProjectsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS streaming_projects (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_by TEXT
        )
      `;
      const { rows } = await sql`SELECT count(*) FROM streaming_projects`;
      if (Number(rows[0].count) === 0) {
        for (let i = 0; i < DEFAULTS.length; i++) {
          await sql`
            INSERT INTO streaming_projects (name, active, sort_order, created_by)
            VALUES (${DEFAULTS[i]}, true, ${i}, 'seed')
            ON CONFLICT (name) DO NOTHING
          `;
        }
      }
    })();
  }
  return ready;
}

export type StreamingProjectRow = {
  id: number;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
};

export async function listActiveStreamingProjects(): Promise<StreamingProjectRow[]> {
  await ensureStreamingProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM streaming_projects WHERE active = true ORDER BY sort_order ASC, name ASC
  `;
  return rows as StreamingProjectRow[];
}

export async function listAllStreamingProjects(): Promise<StreamingProjectRow[]> {
  await ensureStreamingProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM streaming_projects ORDER BY sort_order ASC, name ASC
  `;
  return rows as StreamingProjectRow[];
}

export async function createStreamingProject(name: string, actorEmail: string) {
  await ensureStreamingProjectsSchema();
  const { rows: maxRows } = await sql`SELECT COALESCE(MAX(sort_order), -1) AS m FROM streaming_projects`;
  const nextOrder = Number(maxRows[0].m) + 1;
  const { rows } = await sql`
    INSERT INTO streaming_projects (name, active, sort_order, created_by)
    VALUES (${name}, true, ${nextOrder}, ${actorEmail})
    RETURNING *
  `;
  return rows[0] as StreamingProjectRow;
}

export async function updateStreamingProject(
  id: number,
  patch: { name?: string; active?: boolean }
) {
  await ensureStreamingProjectsSchema();
  if (patch.name !== undefined) {
    await sql`UPDATE streaming_projects SET name = ${patch.name} WHERE id = ${id}`;
  }
  if (patch.active !== undefined) {
    await sql`UPDATE streaming_projects SET active = ${patch.active} WHERE id = ${id}`;
  }
  const { rows } = await sql`SELECT * FROM streaming_projects WHERE id = ${id}`;
  return (rows[0] as StreamingProjectRow) ?? null;
}

export async function isActiveStreamingProjectName(name: string): Promise<boolean> {
  await ensureStreamingProjectsSchema();
  const { rows } = await sql`
    SELECT 1 FROM streaming_projects WHERE name = ${name} AND active = true
  `;
  return rows.length > 0;
}
