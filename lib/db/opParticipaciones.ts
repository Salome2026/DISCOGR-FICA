import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpParticipacion, OpParticipacionInput, OpAuditEntry } from "@discografica/shared/types/op";

let ready: Promise<void> | null = null;

export function ensureOpParticipacionesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_participaciones (
          id TEXT PRIMARY KEY,
          label TEXT, artists TEXT, track TEXT, isrc TEXT,
          participante TEXT, porcentaje NUMERIC, notas TEXT,
          extra JSONB NOT NULL DEFAULT '{}',
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS op_participaciones_isrc_idx ON op_participaciones (isrc)`;
    })();
  }
  return ready;
}

function newId(): string {
  return `opp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToParticipacion(r: Record<string, unknown>): OpParticipacion {
  return {
    id: r.id as string,
    label: (r.label as string | null) ?? null,
    artists: (r.artists as string | null) ?? null,
    track: (r.track as string | null) ?? null,
    isrc: (r.isrc as string | null) ?? null,
    participante: (r.participante as string | null) ?? null,
    porcentaje: r.porcentaje != null ? Number(r.porcentaje) : null,
    notas: (r.notas as string | null) ?? null,
    extra: (r.extra as Record<string, unknown>) ?? {},
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listOpParticipaciones(): Promise<OpParticipacion[]> {
  await ensureOpParticipacionesSchema();
  const { rows } = await sql`SELECT * FROM op_participaciones ORDER BY created_at DESC`;
  return rows.map(rowToParticipacion);
}

export async function getOpParticipacion(id: string): Promise<OpParticipacion | null> {
  await ensureOpParticipacionesSchema();
  const { rows } = await sql`SELECT * FROM op_participaciones WHERE id = ${id}`;
  return rows[0] ? rowToParticipacion(rows[0]) : null;
}

export async function createOpParticipacion(input: OpParticipacionInput, actorEmail: string): Promise<OpParticipacion> {
  await ensureOpParticipacionesSchema();
  const id = newId();
  await sql`
    INSERT INTO op_participaciones (id, label, artists, track, isrc, participante, porcentaje, notas, created_by)
    VALUES (${id}, ${input.label ?? null}, ${input.artists ?? null}, ${input.track ?? null}, ${input.isrc?.trim().toUpperCase() || null},
            ${input.participante ?? null}, ${input.porcentaje ?? null}, ${input.notas ?? null}, ${actorEmail})
  `;
  const created = await getOpParticipacion(id);
  await recordAudit({ actorEmail, action: "op_participaciones_created", entityType: "op_participaciones", entityId: id, after: created });
  return created!;
}

export async function updateOpParticipacion(id: string, input: OpParticipacionInput, actorEmail: string): Promise<OpParticipacion | null> {
  await ensureOpParticipacionesSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_participaciones WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_participaciones SET
      label = ${input.label ?? null}, artists = ${input.artists ?? null}, track = ${input.track ?? null},
      isrc = ${input.isrc?.trim().toUpperCase() || null}, participante = ${input.participante ?? null}, porcentaje = ${input.porcentaje ?? null},
      notas = ${input.notas ?? null}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_participaciones_updated", entityType: "op_participaciones", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToParticipacion(rows[0]);
}

export async function deleteOpParticipacion(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpParticipacionesSchema();
  const { rows } = await sql`SELECT * FROM op_participaciones WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_participaciones WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_participaciones_deleted", entityType: "op_participaciones", entityId: id, before: rows[0] });
  return true;
}

export async function getOpParticipacionHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_participaciones", entityId: id });
  return entries.map((e) => ({ id: e.id, email: e.email, action: e.action, at: e.at, cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null) }));
}
