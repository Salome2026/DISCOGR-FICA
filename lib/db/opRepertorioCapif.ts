import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog } from "@/lib/db/users";
import { diffRows } from "@/lib/auditDiff";
import type { OpRepertorioCapif, OpRepertorioCapifInput, OpAuditEntry } from "@discografica/shared/types/op";

let ready: Promise<void> | null = null;

export function ensureOpRepertorioCapifSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS op_repertorio_capif (
          id TEXT PRIMARY KEY,
          titulo TEXT, album TEXT, artista TEXT, isrc TEXT NOT NULL, sello TEXT,
          titular_derecho TEXT, periodo TEXT, anio_publicacion INTEGER,
          envio_monitoreo TEXT, capif TEXT,
          created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT, updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS op_repertorio_capif_isrc_idx ON op_repertorio_capif (isrc)`;
    })();
  }
  return ready;
}

function newId(): string {
  return `opc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToRepertorio(r: Record<string, unknown>): OpRepertorioCapif {
  return {
    id: r.id as string,
    titulo: (r.titulo as string | null) ?? null,
    album: (r.album as string | null) ?? null,
    artista: (r.artista as string | null) ?? null,
    isrc: r.isrc as string,
    sello: (r.sello as string | null) ?? null,
    titularDerecho: (r.titular_derecho as string | null) ?? null,
    periodo: (r.periodo as string | null) ?? null,
    anioPublicacion: r.anio_publicacion != null ? Number(r.anio_publicacion) : null,
    envioMonitoreo: (r.envio_monitoreo as string | null) ?? null,
    capif: (r.capif as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listOpRepertorioCapif(): Promise<OpRepertorioCapif[]> {
  await ensureOpRepertorioCapifSchema();
  const { rows } = await sql`SELECT * FROM op_repertorio_capif ORDER BY created_at DESC`;
  return rows.map(rowToRepertorio);
}

export async function getOpRepertorioCapif(id: string): Promise<OpRepertorioCapif | null> {
  await ensureOpRepertorioCapifSchema();
  const { rows } = await sql`SELECT * FROM op_repertorio_capif WHERE id = ${id}`;
  return rows[0] ? rowToRepertorio(rows[0]) : null;
}

export async function createOpRepertorioCapif(input: OpRepertorioCapifInput, actorEmail: string): Promise<OpRepertorioCapif> {
  await ensureOpRepertorioCapifSchema();
  const id = newId();
  await sql`
    INSERT INTO op_repertorio_capif (id, titulo, album, artista, isrc, sello, titular_derecho, periodo, anio_publicacion, envio_monitoreo, capif, created_by)
    VALUES (${id}, ${input.titulo ?? null}, ${input.album ?? null}, ${input.artista ?? null}, ${input.isrc.trim().toUpperCase()},
            ${input.sello ?? null}, ${input.titularDerecho ?? null}, ${input.periodo ?? null}, ${input.anioPublicacion ?? null},
            ${input.envioMonitoreo ?? null}, ${input.capif ?? null}, ${actorEmail})
  `;
  const created = await getOpRepertorioCapif(id);
  await recordAudit({ actorEmail, action: "op_repertorio_capif_created", entityType: "op_repertorio_capif", entityId: id, after: created });
  return created!;
}

export async function updateOpRepertorioCapif(id: string, input: OpRepertorioCapifInput, actorEmail: string): Promise<OpRepertorioCapif | null> {
  await ensureOpRepertorioCapifSchema();
  const { rows: beforeRows } = await sql`SELECT * FROM op_repertorio_capif WHERE id = ${id}`;
  if (!beforeRows[0]) return null;
  const { rows } = await sql`
    UPDATE op_repertorio_capif SET
      titulo = ${input.titulo ?? null}, album = ${input.album ?? null}, artista = ${input.artista ?? null},
      isrc = ${input.isrc.trim().toUpperCase()}, sello = ${input.sello ?? null}, titular_derecho = ${input.titularDerecho ?? null},
      periodo = ${input.periodo ?? null}, anio_publicacion = ${input.anioPublicacion ?? null},
      envio_monitoreo = ${input.envioMonitoreo ?? null}, capif = ${input.capif ?? null},
      updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return null;
  if (diffRows(beforeRows[0], rows[0]).length > 0) {
    await recordAudit({ actorEmail, action: "op_repertorio_capif_updated", entityType: "op_repertorio_capif", entityId: id, before: beforeRows[0], after: rows[0] });
  }
  return rowToRepertorio(rows[0]);
}

// Borrar acá saca al ISRC del repertorio, y en la próxima lectura de
// op_ogs/op_remix su cruce CAPIF pasa a NO solo — sin tocar esas tablas.
export async function deleteOpRepertorioCapif(id: string, actorEmail: string): Promise<boolean> {
  await ensureOpRepertorioCapifSchema();
  const { rows } = await sql`SELECT * FROM op_repertorio_capif WHERE id = ${id}`;
  if (!rows[0]) return false;
  await sql`DELETE FROM op_repertorio_capif WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "op_repertorio_capif_deleted", entityType: "op_repertorio_capif", entityId: id, before: rows[0] });
  return true;
}

export async function getOpRepertorioCapifHistory(id: string): Promise<OpAuditEntry[]> {
  const entries = await getAuditLog({ entityType: "op_repertorio_capif", entityId: id });
  return entries.map((e) => ({ id: e.id, email: e.email, action: e.action, at: e.at, cambios: diffRows(e.beforeState as Record<string, unknown> | null, e.afterState as Record<string, unknown> | null) }));
}
