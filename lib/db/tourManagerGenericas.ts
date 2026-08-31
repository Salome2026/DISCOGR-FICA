import { sql } from "@vercel/postgres";
import { recordAudit } from "./users";
import type { HojaGenerica, HojaGenericaInput, GenericShow } from "@discografica/shared/types/tourManager";

// The lighter second kind of hoja de ruta — see packages/shared/src/types/tourManager.ts
// for why this is a separate table/type instead of a variant of
// tourmanager_hojas. `shows` is a plain JSONB array (same pattern as
// tourmanager_hojas.paradas / editorial_splits.letra) — each show is a
// simple object, not a full entity, so there's no benefit to a child table.
let ready: Promise<void> | null = null;

export function ensureTourManagerGenericasSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS tourmanager_hojas_genericas (
          id TEXT PRIMARY KEY,
          artist_name TEXT NOT NULL,
          nombre TEXT,
          shows JSONB NOT NULL DEFAULT '[]',
          estado TEXT NOT NULL DEFAULT 'Borrador',
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ,
          archived_at TIMESTAMPTZ,
          archived_by TEXT
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS tourmanager_hojas_genericas_artist_idx ON tourmanager_hojas_genericas (artist_name)`;
    })();
  }
  return ready;
}

function rowToHojaGenerica(r: Record<string, unknown>): HojaGenerica {
  return {
    id: r.id as string,
    artistName: r.artist_name as string,
    nombre: (r.nombre as string | null) ?? null,
    shows: Array.isArray(r.shows) ? (r.shows as GenericShow[]) : [],
    estado: r.estado as string,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
    archivedAt: (r.archived_at as string | null) ?? null,
    archivedBy: (r.archived_by as string | null) ?? null,
  };
}

export async function listHojasGenericas(opts?: { archived?: boolean }): Promise<HojaGenerica[]> {
  await ensureTourManagerGenericasSchema();
  const { rows } = opts?.archived
    ? await sql`SELECT * FROM tourmanager_hojas_genericas WHERE archived_at IS NOT NULL ORDER BY archived_at DESC`
    : await sql`SELECT * FROM tourmanager_hojas_genericas WHERE archived_at IS NULL ORDER BY created_at DESC`;
  return rows.map(rowToHojaGenerica);
}

export async function getHojaGenerica(id: string): Promise<HojaGenerica | null> {
  await ensureTourManagerGenericasSchema();
  const { rows } = await sql`SELECT * FROM tourmanager_hojas_genericas WHERE id = ${id}`;
  return rows[0] ? rowToHojaGenerica(rows[0]) : null;
}

export async function createHojaGenerica(input: HojaGenericaInput): Promise<HojaGenerica> {
  await ensureTourManagerGenericasSchema();
  const id = `hojagen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO tourmanager_hojas_genericas (id, artist_name, nombre, shows, estado, created_by, updated_by, updated_at)
    VALUES (${id}, ${input.artistName}, ${input.nombre ?? null}, ${JSON.stringify(input.shows)}::jsonb,
            ${input.estado ?? "Borrador"}, ${input.actorEmail}, ${input.actorEmail}, now())
    RETURNING *
  `;
  const hoja = rowToHojaGenerica(rows[0]);
  await recordAudit({ actorEmail: input.actorEmail, action: "hoja_generica_creada", entityType: "tourmanager_hoja_generica", entityId: hoja.id, after: hoja });
  return hoja;
}

export async function updateHojaGenerica(id: string, input: HojaGenericaInput): Promise<HojaGenerica | null> {
  await ensureTourManagerGenericasSchema();
  const current = await getHojaGenerica(id);
  if (!current) return null;
  const { rows } = await sql`
    UPDATE tourmanager_hojas_genericas
    SET artist_name = ${input.artistName}, nombre = ${input.nombre ?? null},
        shows = ${JSON.stringify(input.shows)}::jsonb, estado = ${input.estado ?? current.estado},
        updated_by = ${input.actorEmail}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  const hoja = rowToHojaGenerica(rows[0]);
  await recordAudit({ actorEmail: input.actorEmail, action: "hoja_generica_modificada", entityType: "tourmanager_hoja_generica", entityId: id, before: current, after: hoja });
  return hoja;
}

export async function archiveHojaGenerica(id: string, actorEmail: string): Promise<void> {
  await ensureTourManagerGenericasSchema();
  await sql`UPDATE tourmanager_hojas_genericas SET archived_at = now(), archived_by = ${actorEmail} WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "hoja_generica_archivada", entityType: "tourmanager_hoja_generica", entityId: id });
}

export type { HojaGenerica, HojaGenericaInput, GenericShow };
