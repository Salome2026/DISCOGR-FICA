import { sql } from "@vercel/postgres";
import { recordAudit } from "@/lib/db/users";
import {
  MATERIAL_NEEDS_FIELDS, emptyMaterialNeeds,
  type MaterialNeeds, type CmRequestTipo,
} from "@/lib/cmMaterialRequestConstants";

export { MATERIAL_NEEDS_FIELDS, CM_REQUEST_TIPOS, CM_REQUEST_TIPO_LABELS, emptyMaterialNeeds } from "@/lib/cmMaterialRequestConstants";
export type { MaterialNeeds, MaterialNeedKey, CmRequestTipo } from "@/lib/cmMaterialRequestConstants";

let ready: Promise<void> | null = null;

// "La CM le pide/avisa algo al PM responsable de este artista/lanzamiento" —
// un solo registro para las 3 acciones del pedido original (Solicitar
// material / Informar enlace incorrecto / Dejar observación), distinguidas
// por `tipo`. target_pms es un array (no una fila por PM) para que un
// pedido a un proyecto compartido quede en un único registro que cualquiera
// de los responsables puede resolver — "sin duplicar solicitudes", tal como
// se pidió.
export function ensureCmMaterialRequestsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS cm_material_requests (
          id TEXT PRIMARY KEY,
          launch_id TEXT REFERENCES cm_launches(id) ON DELETE SET NULL,
          artist_id TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          target_pms TEXT[] NOT NULL,
          requested_by TEXT NOT NULL,
          needs JSONB NOT NULL DEFAULT '{}',
          info_adicional TEXT,
          tipo TEXT NOT NULL DEFAULT 'material',
          status TEXT NOT NULL DEFAULT 'Pendiente',
          pm_response TEXT,
          responded_by TEXT,
          responded_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS cm_material_requests_artist_idx ON cm_material_requests (artist_id)`;
      await sql`CREATE INDEX IF NOT EXISTS cm_material_requests_launch_idx ON cm_material_requests (launch_id)`;
      await sql`CREATE INDEX IF NOT EXISTS cm_material_requests_pms_idx ON cm_material_requests USING GIN (target_pms)`;
      await sql`CREATE INDEX IF NOT EXISTS cm_material_requests_status_idx ON cm_material_requests (status)`;
    })();
  }
  return ready;
}

export type CmMaterialRequest = {
  id: string;
  launchId: string | null;
  artistId: string;
  artistName: string;
  targetPms: string[];
  requestedBy: string;
  needs: MaterialNeeds;
  infoAdicional: string | null;
  tipo: CmRequestTipo;
  status: "Pendiente" | "Resuelto";
  pmResponse: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToRequest(r: Record<string, unknown>): CmMaterialRequest {
  return {
    id: r.id as string,
    launchId: (r.launch_id as string) ?? null,
    artistId: r.artist_id as string,
    artistName: r.artist_name as string,
    targetPms: (r.target_pms as string[]) ?? [],
    requestedBy: r.requested_by as string,
    needs: { ...emptyMaterialNeeds(), ...((r.needs as Partial<MaterialNeeds>) ?? {}) },
    infoAdicional: (r.info_adicional as string) ?? null,
    tipo: r.tipo as CmRequestTipo,
    status: r.status as "Pendiente" | "Resuelto",
    pmResponse: (r.pm_response as string) ?? null,
    respondedBy: (r.responded_by as string) ?? null,
    respondedAt: (r.responded_at as string) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  };
}

// @vercel/postgres's sql`` typings only accept Primitive (no arrays), aunque
// el driver real sí manda un array de Postgres — mismo workaround que
// lib/db/listeners.ts / lib/db/legalReleaseRequests.ts's siblings.
function arrayParam<T>(items: T[]): string {
  return items as unknown as string;
}

export async function createMaterialRequest(input: {
  launchId: string | null;
  artistId: string;
  artistName: string;
  targetPms: string[];
  needs: MaterialNeeds;
  infoAdicional: string | null;
  tipo: CmRequestTipo;
  actorEmail: string;
}): Promise<CmMaterialRequest> {
  await ensureCmMaterialRequestsSchema();
  const id = `cmr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO cm_material_requests
      (id, launch_id, artist_id, artist_name, target_pms, requested_by, needs, info_adicional, tipo, status)
    VALUES
      (${id}, ${input.launchId}, ${input.artistId}, ${input.artistName}, ${arrayParam(input.targetPms)}::text[],
       ${input.actorEmail}, ${JSON.stringify(input.needs)}::jsonb, ${input.infoAdicional}, ${input.tipo}, 'Pendiente')
    RETURNING *
  `;
  const request = rowToRequest(rows[0]);
  await recordAudit({
    actorEmail: input.actorEmail,
    action: "cm_material_request_created",
    entityType: "cm_material_request",
    entityId: request.id,
    after: { artistName: request.artistName, targetPms: request.targetPms, tipo: request.tipo },
  });
  return request;
}

export async function getMaterialRequest(id: string): Promise<CmMaterialRequest | null> {
  await ensureCmMaterialRequestsSchema();
  const { rows } = await sql`SELECT * FROM cm_material_requests WHERE id = ${id}`;
  return rows[0] ? rowToRequest(rows[0]) : null;
}

export async function listRequestsForArtist(artistId: string): Promise<CmMaterialRequest[]> {
  await ensureCmMaterialRequestsSchema();
  const { rows } = await sql`
    SELECT * FROM cm_material_requests WHERE artist_id = ${artistId} ORDER BY created_at DESC
  `;
  return rows.map(rowToRequest);
}

export async function listRequestsForPm(pmEmail: string, opts?: { status?: "Pendiente" | "Resuelto" }): Promise<CmMaterialRequest[]> {
  await ensureCmMaterialRequestsSchema();
  const { rows } = opts?.status
    ? await sql`
        SELECT * FROM cm_material_requests
        WHERE ${pmEmail} = ANY(target_pms) AND status = ${opts.status}
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT * FROM cm_material_requests
        WHERE ${pmEmail} = ANY(target_pms)
        ORDER BY created_at DESC
      `;
  return rows.map(rowToRequest);
}

// Cualquiera de los PM apuntados puede responder — el primero que lo hace
// resuelve el pedido para todos (WHERE status='Pendiente' evita una
// respuesta doble en carrera).
export async function respondToRequest(id: string, response: string, actorEmail: string): Promise<CmMaterialRequest | null> {
  await ensureCmMaterialRequestsSchema();
  const { rows } = await sql`
    UPDATE cm_material_requests
    SET status = 'Resuelto', pm_response = ${response}, responded_by = ${actorEmail}, responded_at = now(),
        updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} AND status = 'Pendiente'
    RETURNING *
  `;
  const request = rows[0] ? rowToRequest(rows[0]) : null;
  if (request) {
    await recordAudit({
      actorEmail,
      action: "cm_material_request_resolved",
      entityType: "cm_material_request",
      entityId: id,
      before: { status: "Pendiente" },
      after: { status: "Resuelto", pmResponse: response },
    });
  }
  return request;
}

// {count, lastRequestAt, lastResponseAt} pedidos explícitamente por la
// clienta ("cantidad de reclamos", "última respuesta") — agregado en la
// consulta, no una columna aparte que pueda desincronizarse.
export async function getRequestStatsForArtist(artistId: string): Promise<{ count: number; lastRequestAt: string | null; lastResponseAt: string | null }> {
  await ensureCmMaterialRequestsSchema();
  const { rows } = await sql`
    SELECT COUNT(*)::int AS count, MAX(created_at) AS last_request_at, MAX(responded_at) AS last_response_at
    FROM cm_material_requests WHERE artist_id = ${artistId}
  `;
  const r = rows[0];
  return {
    count: Number(r?.count ?? 0),
    lastRequestAt: (r?.last_request_at as string) ?? null,
    lastResponseAt: (r?.last_response_at as string) ?? null,
  };
}
