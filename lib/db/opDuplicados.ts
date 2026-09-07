import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpDuplicado, OpDuplicadoInput, OpAuditEntry } from "@discografica/shared/types/op";

let ready: Promise<void> | null = null;

export function ensureOpDuplicadosSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_duplicados (
          id TEXT PRIMARY KEY,
          album_artist TEXT, album TEXT, track_artist TEXT, track TEXT,
          isrc TEXT, upc TEXT, release_date DATE, provider TEXT, baja TEXT,
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
    })();
  }
  return ready;
}

function newId(): string {
  return `opd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateOnlyString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function rowToDuplicado(r: Record<string, unknown>): OpDuplicado {
  return {
    id: r.id as string,
    albumArtist: (r.album_artist as string | null) ?? null,
    album: (r.album as string | null) ?? null,
    trackArtist: (r.track_artist as string | null) ?? null,
    track: (r.track as string | null) ?? null,
    isrc: (r.isrc as string | null) ?? null,
    upc: (r.upc as string | null) ?? null,
    releaseDate: toDateOnlyString(r.release_date),
    provider: (r.provider as string | null) ?? null,
    baja: (r.baja as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listOpDuplicados(): Promise<OpDuplicado[]> {
  await ensureOpDuplicadosSchema();
  const { rows } = await sql`SELECT * FROM op_duplicados ORDER BY created_at DESC`;
  return rows.map(rowToDuplicado);
}

export async function getOpDuplicado(id: string): Promise<OpDuplicado | null> {
  await ensureOpDuplicadosSchema();
  const { rows } = await sql`SELECT * FROM op_duplicados WHERE id = ${id}`;
  return rows[0] ? rowToDuplicado(rows[0]) : null;
}

export async function createOpDuplicado(input: OpDuplicadoInput, actorEmail: string): Promise<OpDuplicado> {
  await ensureOpDuplicadosSchema();
  const id = newId();
  await sql`
    INSERT INTO op_duplicados (id, album_artist, album, track_artist, track, isrc, upc, release_date, provider, baja, created_by)
    VALUES (${id}, ${input.albumArtist ?? null}, ${input.album ?? null}, ${input.trackArtist ?? null}, ${input.track ?? null},
            ${input.isrc?.trim().toUpperCase() || null}, ${input.upc ?? null}, ${input.releaseDate?.trim() || null}, ${input.provider ?? null}, ${input.baja ?? null}, ${actorEmail})
  `;
  const created = await getOpDuplicado(id);
  await recordAudit({ actorEmail, action: "op_duplicados_created", entityType: "op_duplicados", entityId: id, after: created });
  return created!;
}

export async function updateOpDuplicado(id: string, input: OpDuplicadoInput, actorEmail: string): Promise<OpDuplicado | null> {
  await ensureOpDuplicadosSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_duplicados WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_duplicados SET
      album_artist = ${input.albumArtist ?? null}, album = ${input.album ?? null}, track_artist = ${input.trackArtist ?? null},
      track = ${input.track ?? null}, isrc = ${input.isrc?.trim().toUpperCase() || null}, upc = ${input.upc ?? null},
      release_date = ${input.releaseDate?.trim() || null}, provider = ${input.provider ?? null}, baja = ${input.baja ?? null},
      updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_duplicados_updated", entityType: "op_duplicados", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToDuplicado(rows[0]);
}

export async function deleteOpDuplicado(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpDuplicadosSchema();
  const { rows } = await sql`SELECT * FROM op_duplicados WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_duplicados WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_duplicados_deleted", entityType: "op_duplicados", entityId: id, before: rows[0] });
  return true;
}

export async function getOpDuplicadoHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_duplicados", entityId: id });
  return entries.map((e) => ({ id: e.id, email: e.email, action: e.action, at: e.at, cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null) }));
}

// Detección en vivo de ISRC/UPC repetidos entre op_ogs + op_remix — distinto
// de esta tabla, que es la bitácora histórica de qué ya se resolvió.
export type OpLiveDuplicateRow = { tabla: "ogs" | "remix"; id: string; trackArtist: string; track: string; isrc: string | null; upc: string | null };
export type OpLiveDuplicateGroup = { key: string; tipo: "isrc" | "upc"; filas: OpLiveDuplicateRow[] };

export async function findLiveDuplicates(): Promise<OpLiveDuplicateGroup[]> {
  // GROUP BY sobre UPPER(isrc): la planilla real tiene el mismo ISRC cargado
  // con distinta capitalización entre hojas (ver comentario en opOgs.ts) —
  // sin esto, dos filas del mismo track podrían no agruparse como duplicado.
  const { rows: isrcDupes } = await sql`
    SELECT UPPER(isrc) AS isrc FROM (
      SELECT isrc FROM op_ogs WHERE isrc IS NOT NULL AND isrc <> ''
      UNION ALL
      SELECT isrc FROM op_remix WHERE isrc IS NOT NULL AND isrc <> ''
    ) t GROUP BY UPPER(isrc) HAVING count(*) > 1
  `;
  const { rows: upcDupes } = await sql`
    SELECT upc FROM (
      SELECT upc FROM op_ogs WHERE upc IS NOT NULL AND upc <> ''
      UNION ALL
      SELECT upc FROM op_remix WHERE upc IS NOT NULL AND upc <> ''
    ) t GROUP BY upc HAVING count(*) > 1
  `;
  const groups: OpLiveDuplicateGroup[] = [];
  for (const { isrc } of isrcDupes) {
    const { rows: ogsRows } = await sql`SELECT id, track_artist, track, isrc, upc FROM op_ogs WHERE UPPER(isrc) = ${isrc}`;
    const { rows: remixRows } = await sql`SELECT id, track_artist, track, isrc, upc FROM op_remix WHERE UPPER(isrc) = ${isrc}`;
    groups.push({
      key: isrc as string, tipo: "isrc",
      filas: [
        ...ogsRows.map((r) => ({ tabla: "ogs" as const, id: r.id as string, trackArtist: r.track_artist as string, track: r.track as string, isrc: r.isrc as string | null, upc: r.upc as string | null })),
        ...remixRows.map((r) => ({ tabla: "remix" as const, id: r.id as string, trackArtist: r.track_artist as string, track: r.track as string, isrc: r.isrc as string | null, upc: r.upc as string | null })),
      ],
    });
  }
  for (const { upc } of upcDupes) {
    const { rows: ogsRows } = await sql`SELECT id, track_artist, track, isrc, upc FROM op_ogs WHERE upc = ${upc}`;
    const { rows: remixRows } = await sql`SELECT id, track_artist, track, isrc, upc FROM op_remix WHERE upc = ${upc}`;
    groups.push({
      key: upc as string, tipo: "upc",
      filas: [
        ...ogsRows.map((r) => ({ tabla: "ogs" as const, id: r.id as string, trackArtist: r.track_artist as string, track: r.track as string, isrc: r.isrc as string | null, upc: r.upc as string | null })),
        ...remixRows.map((r) => ({ tabla: "remix" as const, id: r.id as string, trackArtist: r.track_artist as string, track: r.track as string, isrc: r.isrc as string | null, upc: r.upc as string | null })),
      ],
    });
  }
  return groups;
}
