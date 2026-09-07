import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpIndyanaOld, OpIndyanaOldInput, OpAuditEntry } from "@discografica/shared/types/op";

let ready: Promise<void> | null = null;

export function ensureOpIndyanaOldSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_indyana_old (
          id TEXT PRIMARY KEY,
          titulo TEXT, release_date DATE, isrc TEXT, isrc_video TEXT,
          nombre_ep_lp TEXT, upc TEXT, main_artists TEXT,
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
    })();
  }
  return ready;
}

function newId(): string {
  return `opi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateOnlyString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToIndyana(r: Record<string, unknown>): OpIndyanaOld {
  return {
    id: r.id as string,
    titulo: (r.titulo as string | null) ?? null,
    releaseDate: toDateOnlyString(r.release_date),
    isrc: (r.isrc as string | null) ?? null,
    isrcVideo: (r.isrc_video as string | null) ?? null,
    nombreEpLp: (r.nombre_ep_lp as string | null) ?? null,
    upc: (r.upc as string | null) ?? null,
    mainArtists: (r.main_artists as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listOpIndyanaOld(): Promise<OpIndyanaOld[]> {
  await ensureOpIndyanaOldSchema();
  const { rows } = await sql`SELECT * FROM op_indyana_old ORDER BY created_at DESC`;
  return rows.map(rowToIndyana);
}

export async function getOpIndyanaOld(id: string): Promise<OpIndyanaOld | null> {
  await ensureOpIndyanaOldSchema();
  const { rows } = await sql`SELECT * FROM op_indyana_old WHERE id = ${id}`;
  return rows[0] ? rowToIndyana(rows[0]) : null;
}

export async function createOpIndyanaOld(input: OpIndyanaOldInput, actorEmail: string): Promise<OpIndyanaOld> {
  await ensureOpIndyanaOldSchema();
  const id = newId();
  await sql`
    INSERT INTO op_indyana_old (id, titulo, release_date, isrc, isrc_video, nombre_ep_lp, upc, main_artists, created_by)
    VALUES (${id}, ${input.titulo ?? null}, ${input.releaseDate?.trim() || null}, ${input.isrc?.trim().toUpperCase() || null}, ${input.isrcVideo?.trim().toUpperCase() || null},
            ${input.nombreEpLp ?? null}, ${input.upc ?? null}, ${input.mainArtists ?? null}, ${actorEmail})
  `;
  const created = await getOpIndyanaOld(id);
  await recordAudit({ actorEmail, action: "op_indyana_old_created", entityType: "op_indyana_old", entityId: id, after: created });
  return created!;
}

export async function updateOpIndyanaOld(id: string, input: OpIndyanaOldInput, actorEmail: string): Promise<OpIndyanaOld | null> {
  await ensureOpIndyanaOldSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_indyana_old WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_indyana_old SET
      titulo = ${input.titulo ?? null}, release_date = ${input.releaseDate?.trim() || null}, isrc = ${input.isrc?.trim().toUpperCase() || null},
      isrc_video = ${input.isrcVideo?.trim().toUpperCase() || null}, nombre_ep_lp = ${input.nombreEpLp ?? null}, upc = ${input.upc ?? null},
      main_artists = ${input.mainArtists ?? null}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_indyana_old_updated", entityType: "op_indyana_old", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToIndyana(rows[0]);
}

export async function deleteOpIndyanaOld(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpIndyanaOldSchema();
  const { rows } = await sql`SELECT * FROM op_indyana_old WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_indyana_old WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_indyana_old_deleted", entityType: "op_indyana_old", entityId: id, before: rows[0] });
  return true;
}

export async function getOpIndyanaOldHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_indyana_old", entityId: id });
  return entries.map((e) => ({ id: e.id, email: e.email, action: e.action, at: e.at, cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null) }));
}
