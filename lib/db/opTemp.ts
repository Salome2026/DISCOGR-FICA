import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpTemp, OpTempInput, OpAuditEntry } from "@discografica/shared/types/op";

let ready: Promise<void> | null = null;

export function ensureOpTempSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_temp (
          id TEXT PRIMARY KEY,
          album_artist TEXT, album TEXT, track_artist TEXT, track TEXT,
          isrc TEXT, upc TEXT, release_date DATE, provider_otw TEXT, notas TEXT,
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
    })();
  }
  return ready;
}

function newId(): string {
  return `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateOnlyString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToTemp(r: Record<string, unknown>): OpTemp {
  return {
    id: r.id as string,
    albumArtist: (r.album_artist as string | null) ?? null,
    album: (r.album as string | null) ?? null,
    trackArtist: (r.track_artist as string | null) ?? null,
    track: (r.track as string | null) ?? null,
    isrc: (r.isrc as string | null) ?? null,
    upc: (r.upc as string | null) ?? null,
    releaseDate: toDateOnlyString(r.release_date),
    providerOtw: (r.provider_otw as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listOpTemp(): Promise<OpTemp[]> {
  await ensureOpTempSchema();
  const { rows } = await sql`SELECT * FROM op_temp ORDER BY created_at DESC`;
  return rows.map(rowToTemp);
}

export async function getOpTemp(id: string): Promise<OpTemp | null> {
  await ensureOpTempSchema();
  const { rows } = await sql`SELECT * FROM op_temp WHERE id = ${id}`;
  return rows[0] ? rowToTemp(rows[0]) : null;
}

export async function createOpTemp(input: OpTempInput, actorEmail: string): Promise<OpTemp> {
  await ensureOpTempSchema();
  const id = newId();
  await sql`
    INSERT INTO op_temp (id, album_artist, album, track_artist, track, isrc, upc, release_date, provider_otw, notas, created_by)
    VALUES (${id}, ${input.albumArtist ?? null}, ${input.album ?? null}, ${input.trackArtist ?? null}, ${input.track ?? null},
            ${input.isrc?.trim().toUpperCase() || null}, ${input.upc ?? null}, ${input.releaseDate?.trim() || null}, ${input.providerOtw ?? null}, ${input.notas ?? null}, ${actorEmail})
  `;
  const created = await getOpTemp(id);
  await recordAudit({ actorEmail, action: "op_temp_created", entityType: "op_temp", entityId: id, after: created });
  return created!;
}

export async function updateOpTemp(id: string, input: OpTempInput, actorEmail: string): Promise<OpTemp | null> {
  await ensureOpTempSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_temp WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_temp SET
      album_artist = ${input.albumArtist ?? null}, album = ${input.album ?? null}, track_artist = ${input.trackArtist ?? null},
      track = ${input.track ?? null}, isrc = ${input.isrc?.trim().toUpperCase() || null}, upc = ${input.upc ?? null},
      release_date = ${input.releaseDate?.trim() || null}, provider_otw = ${input.providerOtw ?? null}, notas = ${input.notas ?? null},
      updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_temp_updated", entityType: "op_temp", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToTemp(rows[0]);
}

export async function deleteOpTemp(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpTempSchema();
  const { rows } = await sql`SELECT * FROM op_temp WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_temp WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_temp_deleted", entityType: "op_temp", entityId: id, before: rows[0] });
  return true;
}

export async function getOpTempHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_temp", entityId: id });
  return entries.map((e) => ({ id: e.id, email: e.email, action: e.action, at: e.at, cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null) }));
}
