import { sql } from "@vercel/postgres";
import { recordAudit } from "./users";
import type {
  LegalReleaseRequest,
  ReleaseParticipant,
  ReleaseRequestCard,
} from "@discografica/shared/types/legalReleaseRequests";

export type { LegalReleaseRequest, ReleaseParticipant, ReleaseRequestCard };

let ready: Promise<void> | null = null;

export function ensureLegalReleaseRequestsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS legal_release_requests (
          id TEXT PRIMARY KEY,
          pm_release_id BIGINT NOT NULL,
          track_name TEXT NOT NULL,
          artist_display TEXT NOT NULL,
          sello TEXT,
          fecha_lanzamiento DATE,
          participants JSONB NOT NULL DEFAULT '[]',
          estado TEXT NOT NULL DEFAULT 'Pendiente de envío',
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          reviewed_by TEXT,
          reviewed_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS legal_release_requests_estado_idx ON legal_release_requests (estado)`;
      await sql`CREATE INDEX IF NOT EXISTS legal_release_requests_pm_release_idx ON legal_release_requests (pm_release_id)`;
      // Clasificación del release completo (Artista/Sello/PPD) — le indica a
      // Legal de qué forma procesarlo. Nullable para no romper filas viejas.
      await sql`ALTER TABLE legal_release_requests ADD COLUMN IF NOT EXISTS tipo TEXT`;
    })();
  }
  return ready;
}

function rowToRequest(r: Record<string, unknown>): LegalReleaseRequest {
  return {
    id: r.id as string,
    pmReleaseId: Number(r.pm_release_id),
    trackName: r.track_name as string,
    artistDisplay: r.artist_display as string,
    sello: (r.sello as string | null) ?? null,
    tipo: (r.tipo as LegalReleaseRequest["tipo"]) ?? null,
    // fecha_lanzamiento es una columna DATE — @vercel/postgres la devuelve
    // como Date, no string, en esta capa (todavía server-side, antes de
    // pasar por JSON.stringify). String(date) usa Date.prototype.toString()
    // (formato "Tue Sep 15 2026...", en la zona horaria del proceso) en vez
    // de la fecha calendario real — toISOString().slice(0,10) da la fecha
    // correcta sin depender de esa conversión.
    fechaLanzamiento: r.fecha_lanzamiento
      ? r.fecha_lanzamiento instanceof Date
        ? r.fecha_lanzamiento.toISOString().slice(0, 10)
        : String(r.fecha_lanzamiento).slice(0, 10)
      : null,
    participants: (r.participants as ReleaseParticipant[]) ?? [],
    estado: r.estado as "Pendiente de envío" | "Revisado",
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    reviewedBy: (r.reviewed_by as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
  };
}

export async function getReleaseRequestByPmReleaseId(pmReleaseId: number): Promise<LegalReleaseRequest | null> {
  await ensureLegalReleaseRequestsSchema();
  const { rows } = await sql`SELECT * FROM legal_release_requests WHERE pm_release_id = ${pmReleaseId}`;
  return rows[0] ? rowToRequest(rows[0]) : null;
}

export async function createReleaseRequest(input: {
  pmReleaseId: number;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  tipo: LegalReleaseRequest["tipo"];
  participants: ReleaseParticipant[];
  actorEmail: string;
}): Promise<LegalReleaseRequest> {
  await ensureLegalReleaseRequestsSchema();

  const existing = await getReleaseRequestByPmReleaseId(input.pmReleaseId);
  if (existing) {
    throw new Error("Este fonograma ya tiene un Release cargado.");
  }

  const sum = input.participants.reduce((s, p) => s + p.percentX100, 0);
  if (sum !== 10000) {
    throw new Error("Los porcentajes de los participantes tienen que sumar exactamente 100%.");
  }
  if (input.participants.length === 0) {
    throw new Error("Agregá al menos un participante.");
  }

  const id = `rlr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO legal_release_requests
      (id, pm_release_id, track_name, artist_display, sello, fecha_lanzamiento, tipo, participants, estado, created_by)
    VALUES
      (${id}, ${input.pmReleaseId}, ${input.trackName}, ${input.artistDisplay}, ${input.sello}, ${input.fechaLanzamiento}, ${input.tipo},
       ${JSON.stringify(input.participants)}::jsonb, 'Pendiente de envío', ${input.actorEmail})
    RETURNING *
  `;
  const request = rowToRequest(rows[0]);
  await recordAudit({
    actorEmail: input.actorEmail,
    action: "release_request_created",
    entityType: "legal_release_request",
    entityId: request.id,
    after: { trackName: request.trackName, artistDisplay: request.artistDisplay, participants: request.participants },
  });
  return request;
}

export async function listReleaseRequests(opts: { estado: "Pendiente de envío" | "Revisado"; q?: string }): Promise<ReleaseRequestCard[]> {
  await ensureLegalReleaseRequestsSchema();
  const q = opts.q?.trim();
  const { rows } = q
    ? await sql`
        SELECT id, track_name, artist_display, tipo, estado, created_by, created_at, reviewed_at
        FROM legal_release_requests
        WHERE estado = ${opts.estado} AND (track_name ILIKE ${"%" + q + "%"} OR artist_display ILIKE ${"%" + q + "%"})
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT id, track_name, artist_display, tipo, estado, created_by, created_at, reviewed_at
        FROM legal_release_requests
        WHERE estado = ${opts.estado}
        ORDER BY created_at DESC
      `;
  return rows.map((r) => ({
    id: r.id as string,
    trackName: r.track_name as string,
    artistDisplay: r.artist_display as string,
    tipo: (r.tipo as ReleaseRequestCard["tipo"]) ?? null,
    estado: r.estado as "Pendiente de envío" | "Revisado",
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
  }));
}

export async function getReleaseRequest(id: string): Promise<LegalReleaseRequest | null> {
  await ensureLegalReleaseRequestsSchema();
  const { rows } = await sql`SELECT * FROM legal_release_requests WHERE id = ${id}`;
  return rows[0] ? rowToRequest(rows[0]) : null;
}

// Sin ruta de edición tras "Revisado" — mismo criterio que markSplitSent en
// lib/db/editorialSplits.ts: "bloqueado" por la ausencia de un PATCH de
// edición, no por una bandera que un editor pudiera esquivar.
export async function markReleaseRequestReviewed(id: string, actorEmail: string): Promise<LegalReleaseRequest | null> {
  await ensureLegalReleaseRequestsSchema();
  const { rows } = await sql`
    UPDATE legal_release_requests SET estado = 'Revisado', reviewed_by = ${actorEmail}, reviewed_at = now()
    WHERE id = ${id} AND estado = 'Pendiente de envío'
    RETURNING *
  `;
  const request = rows[0] ? rowToRequest(rows[0]) : null;
  if (request) {
    await recordAudit({
      actorEmail,
      action: "release_request_reviewed",
      entityType: "legal_release_request",
      entityId: request.id,
      before: { estado: "Pendiente de envío" },
      after: { estado: "Revisado", reviewedBy: request.reviewedBy, reviewedAt: request.reviewedAt },
    });
  }
  return request;
}
