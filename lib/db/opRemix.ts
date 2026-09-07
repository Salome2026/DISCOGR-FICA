import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpRemix, OpRemixInput, OpAuditEntry } from "@discografica/shared/types/op";

let ready: Promise<void> | null = null;

export function ensureOpRemixSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_remix (
          id TEXT PRIMARY KEY,
          album_artist TEXT, album TEXT, track_artist TEXT NOT NULL, track TEXT NOT NULL,
          isrc TEXT, upc TEXT, release_date DATE, provider TEXT, sello TEXT,
          extra JSONB NOT NULL DEFAULT '{}',
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS op_remix_isrc_idx ON op_remix (isrc)`;
      await sql`CREATE INDEX IF NOT EXISTS op_remix_upc_idx ON op_remix (upc)`;
    })();
  }
  return ready;
}

function newId(): string {
  return `opr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateOnlyString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToRemix(r: Record<string, unknown>): OpRemix {
  return {
    id: r.id as string,
    albumArtist: (r.album_artist as string | null) ?? null,
    album: (r.album as string | null) ?? null,
    trackArtist: r.track_artist as string,
    track: r.track as string,
    isrc: (r.isrc as string | null) ?? null,
    upc: (r.upc as string | null) ?? null,
    releaseDate: toDateOnlyString(r.release_date),
    provider: (r.provider as string | null) ?? null,
    sello: (r.sello as string | null) ?? null,
    extra: (r.extra as Record<string, unknown>) ?? {},
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listOpRemix(): Promise<OpRemix[]> {
  await ensureOpRemixSchema();
  const { rows } = await sql`SELECT * FROM op_remix ORDER BY created_at DESC`;
  return rows.map(rowToRemix);
}

export async function getOpRemix(id: string): Promise<OpRemix | null> {
  await ensureOpRemixSchema();
  const { rows } = await sql`SELECT * FROM op_remix WHERE id = ${id}`;
  return rows[0] ? rowToRemix(rows[0]) : null;
}

export async function createOpRemix(input: OpRemixInput, actorEmail: string): Promise<OpRemix> {
  await ensureOpRemixSchema();
  const id = newId();
  await sql`
    INSERT INTO op_remix (id, album_artist, album, track_artist, track, isrc, upc, release_date, provider, sello, created_by)
    VALUES (${id}, ${input.albumArtist ?? null}, ${input.album ?? null}, ${input.trackArtist}, ${input.track},
            ${input.isrc?.trim().toUpperCase() || null}, ${input.upc ?? null}, ${input.releaseDate?.trim() || null}, ${input.provider ?? null},
            ${input.sello ?? null}, ${actorEmail})
  `;
  const created = await getOpRemix(id);
  await recordAudit({ actorEmail, action: "op_remix_created", entityType: "op_remix", entityId: id, after: created });
  return created!;
}

export async function updateOpRemix(id: string, input: OpRemixInput, actorEmail: string): Promise<OpRemix | null> {
  await ensureOpRemixSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_remix WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_remix SET
      album_artist = ${input.albumArtist ?? null}, album = ${input.album ?? null},
      track_artist = ${input.trackArtist}, track = ${input.track},
      isrc = ${input.isrc?.trim().toUpperCase() || null}, upc = ${input.upc ?? null}, release_date = ${input.releaseDate?.trim() || null},
      provider = ${input.provider ?? null}, sello = ${input.sello ?? null},
      updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_remix_updated", entityType: "op_remix", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToRemix(rows[0]);
}

export async function deleteOpRemix(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpRemixSchema();
  const { rows } = await sql`SELECT * FROM op_remix WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_remix WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_remix_deleted", entityType: "op_remix", entityId: id, before: rows[0] });
  return true;
}

export async function getOpRemixHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_remix", entityId: id });
  return entries.map((e) => ({
    id: e.id, email: e.email, action: e.action, at: e.at,
    cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null),
  }));
}
