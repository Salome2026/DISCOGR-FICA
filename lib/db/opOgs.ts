import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpOgs, OpOgsInput, OpAuditEntry } from "@discografica/shared/types/op";

let ready: Promise<void> | null = null;

export function ensureOpOgsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_ogs (
          id TEXT PRIMARY KEY,
          album_artist TEXT, album TEXT, track_artist TEXT NOT NULL, track TEXT NOT NULL,
          isrc TEXT, upc TEXT, release_date DATE, year INTEGER, provider TEXT, sello TEXT,
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS op_ogs_isrc_idx ON op_ogs (isrc)`;
      await sql`CREATE INDEX IF NOT EXISTS op_ogs_upc_idx ON op_ogs (upc)`;
    })();
  }
  return ready;
}

function newId(): string {
  return `opo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Postgres DATE vuelve como objeto Date (no string) vía @vercel/postgres —
// mismo bug ya encontrado en lib/ics.ts.
function toDateOnlyString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// El "capif" nunca se guarda — se resuelve acá con un EXISTS contra
// op_repertorio_capif, así que editar el repertorio (Fase 5) actualiza el
// estado de toda la tabla sin tocar una sola fila de op_ogs. Evita el tipo
// de desactualización que se encontró en la planilla real (ISRC
// ARDL12300034: marcado SI aunque ya no está en el repertorio actual).
// Comparación con UPPER() en ambos lados: la planilla real tiene ese mismo
// ISRC cargado con distinta capitalización en ogs ("ARDL12300034") que en
// repertorio_capif ("ARdl12300034") — sin esto, el cruce daría NO por una
// simple diferencia de mayúsculas, no por estar realmente fuera del repertorio.
function rowToOgs(r: Record<string, unknown>): OpOgs {
  return {
    id: r.id as string,
    albumArtist: (r.album_artist as string | null) ?? null,
    album: (r.album as string | null) ?? null,
    trackArtist: r.track_artist as string,
    track: r.track as string,
    isrc: (r.isrc as string | null) ?? null,
    upc: (r.upc as string | null) ?? null,
    releaseDate: toDateOnlyString(r.release_date),
    year: r.year != null ? Number(r.year) : null,
    provider: (r.provider as string | null) ?? null,
    sello: (r.sello as string | null) ?? null,
    capif: r.capif === true ? "SI" : "NO",
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

// @vercel/postgres no expone sql.query()/sql.unsafe() para SQL crudo — cada
// sql`` se ejecuta de inmediato, sin fragmentos componibles (misma
// limitación ya documentada en lib/db/cmMetrics.ts) — así que el EXISTS de
// CAPIF se repite completo en las dos queries en vez de armarlo dinámico.
export async function listOpOgs(): Promise<OpOgs[]> {
  await ensureOpOgsSchema();
  const { rows } = await sql`
    SELECT o.*, EXISTS(
      SELECT 1 FROM op_repertorio_capif c WHERE UPPER(c.isrc) = UPPER(o.isrc) AND o.isrc IS NOT NULL
    ) AS capif
    FROM op_ogs o ORDER BY o.created_at DESC
  `;
  return rows.map(rowToOgs);
}

export async function getOpOgs(id: string): Promise<OpOgs | null> {
  await ensureOpOgsSchema();
  const { rows } = await sql`
    SELECT o.*, EXISTS(
      SELECT 1 FROM op_repertorio_capif c WHERE UPPER(c.isrc) = UPPER(o.isrc) AND o.isrc IS NOT NULL
    ) AS capif
    FROM op_ogs o WHERE o.id = ${id}
  `;
  return rows[0] ? rowToOgs(rows[0]) : null;
}

async function getRawRow(id: string): Promise<Record<string, unknown> | null> {
  const { rows } = await sql`SELECT * FROM op_ogs WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function createOpOgs(input: OpOgsInput, actorEmail: string): Promise<OpOgs> {
  await ensureOpOgsSchema();
  const id = newId();
  await sql`
    INSERT INTO op_ogs (id, album_artist, album, track_artist, track, isrc, upc, release_date, year, provider, sello, created_by)
    VALUES (${id}, ${input.albumArtist ?? null}, ${input.album ?? null}, ${input.trackArtist}, ${input.track},
            ${input.isrc?.trim().toUpperCase() || null}, ${input.upc ?? null}, ${input.releaseDate?.trim() || null}, ${input.year ?? null},
            ${input.provider ?? null}, ${input.sello ?? null}, ${actorEmail})
  `;
  const created = await getOpOgs(id);
  await recordAudit({ actorEmail, action: "op_ogs_created", entityType: "op_ogs", entityId: id, after: created });
  return created!;
}

export async function updateOpOgs(id: string, input: OpOgsInput, actorEmail: string): Promise<OpOgs | null> {
  await ensureOpOgsSchema();
  const before = await getRawRow(id);
  if (!before) return null;
  const { rows } = await sql`
    UPDATE op_ogs SET
      album_artist = ${input.albumArtist ?? null}, album = ${input.album ?? null},
      track_artist = ${input.trackArtist}, track = ${input.track},
      isrc = ${input.isrc?.trim().toUpperCase() || null}, upc = ${input.upc ?? null}, release_date = ${input.releaseDate?.trim() || null},
      year = ${input.year ?? null}, provider = ${input.provider ?? null}, sello = ${input.sello ?? null},
      updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return null;
  const changes = diffRows(before, rows[0]);
  if (changes.length > 0) {
    await recordAudit({ actorEmail, action: "op_ogs_updated", entityType: "op_ogs", entityId: id, before, after: rows[0] });
  }
  return getOpOgs(id);
}

export async function deleteOpOgs(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpOgsSchema();
  const before = await getRawRow(id);
  if (!before) return false;
  await sql`DELETE FROM op_ogs WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_ogs_deleted", entityType: "op_ogs", entityId: id, before });
  return true;
}

export async function getOpOgsHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_ogs", entityId: id });
  return entries.map((e) => ({
    id: e.id,
    email: e.email,
    action: e.action,
    at: e.at,
    cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null),
  }));
}
