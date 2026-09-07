import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpIsrcAudio, OpIsrcAudioInput, OpIsrcVideo, OpIsrcVideoInput, OpAuditEntry } from "@discografica/shared/types/op";

// Unifica isrc 2024/2025/2026 audio (y video) en una sola tabla con
// columna year — las 6 hojas originales comparten exactamente el mismo
// shape de 3 columnas, y esto es justo lo que habilita el filtro "por
// año" pedido como feature, sin 6 pantallas paralelas.
let ready: Promise<void> | null = null;

export function ensureOpIsrcSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_isrc_audio (
          id TEXT PRIMARY KEY, year INTEGER NOT NULL, isrc TEXT, artista TEXT, track TEXT,
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS op_isrc_video (
          id TEXT PRIMARY KEY, year INTEGER NOT NULL, isrc TEXT, artista TEXT, video TEXT,
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS op_isrc_audio_isrc_idx ON op_isrc_audio (isrc)`;
      await sql`CREATE INDEX IF NOT EXISTS op_isrc_video_isrc_idx ON op_isrc_video (isrc)`;
    })();
  }
  return ready;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToAudio(r: Record<string, unknown>): OpIsrcAudio {
  return {
    id: r.id as string, year: Number(r.year), isrc: (r.isrc as string | null) ?? null,
    artista: (r.artista as string | null) ?? null, track: (r.track as string | null) ?? null,
    createdBy: r.created_by as string, createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null, updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function rowToVideo(r: Record<string, unknown>): OpIsrcVideo {
  return {
    id: r.id as string, year: Number(r.year), isrc: (r.isrc as string | null) ?? null,
    artista: (r.artista as string | null) ?? null, video: (r.video as string | null) ?? null,
    createdBy: r.created_by as string, createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null, updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listOpIsrcAudio(): Promise<OpIsrcAudio[]> {
  await ensureOpIsrcSchema();
  const { rows } = await sql`SELECT * FROM op_isrc_audio ORDER BY year DESC, created_at DESC`;
  return rows.map(rowToAudio);
}

export async function getOpIsrcAudio(id: string): Promise<OpIsrcAudio | null> {
  await ensureOpIsrcSchema();
  const { rows } = await sql`SELECT * FROM op_isrc_audio WHERE id = ${id}`;
  return rows[0] ? rowToAudio(rows[0]) : null;
}

export async function createOpIsrcAudio(input: OpIsrcAudioInput, actorEmail: string): Promise<OpIsrcAudio> {
  await ensureOpIsrcSchema();
  const id = newId("opia");
  await sql`
    INSERT INTO op_isrc_audio (id, year, isrc, artista, track, created_by)
    VALUES (${id}, ${input.year}, ${input.isrc?.trim().toUpperCase() || null}, ${input.artista ?? null}, ${input.track ?? null}, ${actorEmail})
  `;
  const created = await getOpIsrcAudio(id);
  await recordAudit({ actorEmail, action: "op_isrc_audio_created", entityType: "op_isrc_audio", entityId: id, after: created });
  return created!;
}

export async function updateOpIsrcAudio(id: string, input: OpIsrcAudioInput, actorEmail: string): Promise<OpIsrcAudio | null> {
  await ensureOpIsrcSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_isrc_audio WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_isrc_audio SET year = ${input.year}, isrc = ${input.isrc?.trim().toUpperCase() || null}, artista = ${input.artista ?? null},
      track = ${input.track ?? null}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_isrc_audio_updated", entityType: "op_isrc_audio", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToAudio(rows[0]);
}

export async function deleteOpIsrcAudio(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpIsrcSchema();
  const { rows } = await sql`SELECT * FROM op_isrc_audio WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_isrc_audio WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_isrc_audio_deleted", entityType: "op_isrc_audio", entityId: id, before: rows[0] });
  return true;
}

export async function getOpIsrcAudioHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_isrc_audio", entityId: id });
  return entries.map((e) => ({ id: e.id, email: e.email, action: e.action, at: e.at, cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null) }));
}

export async function listOpIsrcVideo(): Promise<OpIsrcVideo[]> {
  await ensureOpIsrcSchema();
  const { rows } = await sql`SELECT * FROM op_isrc_video ORDER BY year DESC, created_at DESC`;
  return rows.map(rowToVideo);
}

export async function getOpIsrcVideo(id: string): Promise<OpIsrcVideo | null> {
  await ensureOpIsrcSchema();
  const { rows } = await sql`SELECT * FROM op_isrc_video WHERE id = ${id}`;
  return rows[0] ? rowToVideo(rows[0]) : null;
}

export async function createOpIsrcVideo(input: OpIsrcVideoInput, actorEmail: string): Promise<OpIsrcVideo> {
  await ensureOpIsrcSchema();
  const id = newId("opiv");
  await sql`
    INSERT INTO op_isrc_video (id, year, isrc, artista, video, created_by)
    VALUES (${id}, ${input.year}, ${input.isrc?.trim().toUpperCase() || null}, ${input.artista ?? null}, ${input.video ?? null}, ${actorEmail})
  `;
  const created = await getOpIsrcVideo(id);
  await recordAudit({ actorEmail, action: "op_isrc_video_created", entityType: "op_isrc_video", entityId: id, after: created });
  return created!;
}

export async function updateOpIsrcVideo(id: string, input: OpIsrcVideoInput, actorEmail: string): Promise<OpIsrcVideo | null> {
  await ensureOpIsrcSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_isrc_video WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_isrc_video SET year = ${input.year}, isrc = ${input.isrc?.trim().toUpperCase() || null}, artista = ${input.artista ?? null},
      video = ${input.video ?? null}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_isrc_video_updated", entityType: "op_isrc_video", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToVideo(rows[0]);
}

export async function deleteOpIsrcVideo(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpIsrcSchema();
  const { rows } = await sql`SELECT * FROM op_isrc_video WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_isrc_video WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_isrc_video_deleted", entityType: "op_isrc_video", entityId: id, before: rows[0] });
  return true;
}

export async function getOpIsrcVideoHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_isrc_video", entityId: id });
  return entries.map((e) => ({ id: e.id, email: e.email, action: e.action, at: e.at, cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null) }));
}
