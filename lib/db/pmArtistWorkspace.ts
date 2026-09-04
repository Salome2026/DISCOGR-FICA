import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensurePmArtistWorkspaceSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS pm_artist_profiles (
          artist_id TEXT PRIMARY KEY,
          plan_anual TEXT,
          objetivos_generales TEXT,
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_artist_action_items (
          id BIGSERIAL PRIMARY KEY,
          artist_id TEXT NOT NULL,
          title TEXT NOT NULL,
          done BOOLEAN NOT NULL DEFAULT false,
          done_by TEXT,
          done_at TIMESTAMPTZ,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_artist_action_items_artist_idx ON pm_artist_action_items (artist_id)`;
      // Append-only by construction — same convention as rizzvor_project_comments,
      // no UPDATE/DELETE ever exposed for this table.
      await sql`
        CREATE TABLE IF NOT EXISTS pm_artist_notes (
          id BIGSERIAL PRIMARY KEY,
          artist_id TEXT NOT NULL,
          author_email TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_artist_notes_artist_idx ON pm_artist_notes (artist_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_meeting_requests (
          id TEXT PRIMARY KEY,
          artist_id TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          requested_by TEXT NOT NULL,
          comment TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'Media',
          suggested_date DATE,
          status TEXT NOT NULL DEFAULT 'Pendiente',
          scheduled_date DATE,
          scheduled_time TEXT,
          management_notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_meeting_requests_artist_idx ON pm_meeting_requests (artist_id)`;
      await sql`CREATE INDEX IF NOT EXISTS pm_meeting_requests_status_idx ON pm_meeting_requests (status)`;
      await sql`CREATE INDEX IF NOT EXISTS pm_meeting_requests_created_idx ON pm_meeting_requests (created_at DESC)`;
      // Campos del calendario "Reuniones de Management" — aditivos sobre la
      // misma tabla en vez de un sistema paralelo: toda fila de acá YA ES
      // una reunión con Management (nunca se mezcla con lanzamientos/shows/
      // estudios), así que el calendario nuevo solo necesita más columnas,
      // no otra tabla. requested_by pasa a cubrir también "PM responsable"
      // cuando Management crea la reunión directamente (no solo cuando un
      // PM la pidió) — mismo campo, alcance un poco más amplio, sin romper
      // nada de lo que ya lo usa.
      await sql`ALTER TABLE pm_meeting_requests ADD COLUMN IF NOT EXISTS participantes TEXT`;
      await sql`ALTER TABLE pm_meeting_requests ADD COLUMN IF NOT EXISTS modalidad TEXT`;
      await sql`ALTER TABLE pm_meeting_requests ADD COLUMN IF NOT EXISTS direccion_o_link TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS pm_meeting_requests_scheduled_idx ON pm_meeting_requests (scheduled_date)`;
    })();
  }
  return ready;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// "Cancelada" sumado a pedido del calendario de Management — las 3 de
// siempre (Pendiente/Agendada/Realizada) no se renombran acá para no romper
// nada de lo que ya filtra/compara por esos literales; el calendario nuevo
// simplemente traduce estas mismas 4 a Solicitada/Confirmada/Realizada/
// Cancelada solo en su propia UI (ver MEETING_STATUS_CALENDAR_LABELS).
export const MEETING_REQUEST_STATUSES = ["Pendiente", "Agendada", "Realizada", "Cancelada"] as const;
export type MeetingRequestStatus = (typeof MEETING_REQUEST_STATUSES)[number];
export const MEETING_REQUEST_PRIORITIES = ["Alta", "Media", "Baja"] as const;
export type MeetingRequestPriority = (typeof MEETING_REQUEST_PRIORITIES)[number];
export const MEETING_MODALIDADES = ["Presencial", "Virtual"] as const;
export type MeetingModalidad = (typeof MEETING_MODALIDADES)[number];
export const MEETING_STATUS_CALENDAR_LABELS: Record<MeetingRequestStatus, string> = {
  Pendiente: "Solicitada",
  Agendada: "Confirmada",
  Realizada: "Realizada",
  Cancelada: "Cancelada",
};

export type PmArtistProfile = {
  artistId: string;
  planAnual: string | null;
  objetivosGenerales: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type PmArtistActionItem = {
  id: number;
  artistId: string;
  title: string;
  done: boolean;
  doneBy: string | null;
  doneAt: string | null;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
};

export type PmArtistNote = {
  id: number;
  artistId: string;
  authorEmail: string;
  body: string;
  createdAt: string;
};

function rowToProfile(r: Record<string, unknown>): PmArtistProfile {
  return {
    artistId: r.artist_id as string,
    planAnual: (r.plan_anual as string | null) ?? null,
    objetivosGenerales: (r.objetivos_generales as string | null) ?? null,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function rowToActionItem(r: Record<string, unknown>): PmArtistActionItem {
  return {
    id: Number(r.id),
    artistId: r.artist_id as string,
    title: r.title as string,
    done: r.done as boolean,
    doneBy: (r.done_by as string | null) ?? null,
    doneAt: (r.done_at as string | null) ?? null,
    sortOrder: Number(r.sort_order),
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
  };
}

function rowToNote(r: Record<string, unknown>): PmArtistNote {
  return {
    id: Number(r.id),
    artistId: r.artist_id as string,
    authorEmail: r.author_email as string,
    body: r.body as string,
    createdAt: r.created_at as string,
  };
}

// ---------- Profile (living document, edited in place) ----------

export async function getArtistProfile(artistId: string): Promise<PmArtistProfile | null> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`SELECT * FROM pm_artist_profiles WHERE artist_id = ${artistId}`;
  return rows[0] ? rowToProfile(rows[0]) : null;
}

export async function upsertArtistProfile(
  artistId: string,
  input: { planAnual?: string | null; objetivosGenerales?: string | null },
  actorEmail: string
): Promise<PmArtistProfile> {
  await ensurePmArtistWorkspaceSchema();
  const current = await getArtistProfile(artistId);
  const planAnual = input.planAnual !== undefined ? input.planAnual : (current?.planAnual ?? null);
  const objetivosGenerales =
    input.objetivosGenerales !== undefined ? input.objetivosGenerales : (current?.objetivosGenerales ?? null);
  const { rows } = await sql`
    INSERT INTO pm_artist_profiles (artist_id, plan_anual, objetivos_generales, updated_by, updated_at)
    VALUES (${artistId}, ${planAnual}, ${objetivosGenerales}, ${actorEmail}, now())
    ON CONFLICT (artist_id) DO UPDATE SET
      plan_anual = EXCLUDED.plan_anual,
      objetivos_generales = EXCLUDED.objetivos_generales,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING *
  `;
  return rowToProfile(rows[0]);
}

// ---------- Action items ("próximas acciones y temas pendientes" = done=false,
// "historial de acciones realizadas" = done=true — one list, split by the flag) ----------

export async function listActionItems(artistId: string): Promise<PmArtistActionItem[]> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`
    SELECT * FROM pm_artist_action_items WHERE artist_id = ${artistId} ORDER BY sort_order ASC, id ASC
  `;
  return rows.map(rowToActionItem);
}

export async function addActionItem(artistId: string, title: string, actorEmail: string): Promise<PmArtistActionItem> {
  await ensurePmArtistWorkspaceSchema();
  const { rows: existing } = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM pm_artist_action_items WHERE artist_id = ${artistId}
  `;
  const nextOrder = Number(existing[0]?.max_order ?? -1) + 1;
  const { rows } = await sql`
    INSERT INTO pm_artist_action_items (artist_id, title, sort_order, created_by)
    VALUES (${artistId}, ${title}, ${nextOrder}, ${actorEmail})
    RETURNING *
  `;
  return rowToActionItem(rows[0]);
}

export async function toggleActionItem(
  id: number,
  artistId: string,
  done: boolean,
  actorEmail: string
): Promise<PmArtistActionItem | null> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = done
    ? await sql`
        UPDATE pm_artist_action_items SET done = true, done_by = ${actorEmail}, done_at = now()
        WHERE id = ${id} AND artist_id = ${artistId}
        RETURNING *
      `
    : await sql`
        UPDATE pm_artist_action_items SET done = false, done_by = NULL, done_at = NULL
        WHERE id = ${id} AND artist_id = ${artistId}
        RETURNING *
      `;
  return rows[0] ? rowToActionItem(rows[0]) : null;
}

export async function removeActionItem(id: number, artistId: string): Promise<void> {
  await ensurePmArtistWorkspaceSchema();
  await sql`DELETE FROM pm_artist_action_items WHERE id = ${id} AND artist_id = ${artistId}`;
}

// ---------- Notes (append-only) ----------

export async function listNotes(artistId: string): Promise<PmArtistNote[]> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`SELECT * FROM pm_artist_notes WHERE artist_id = ${artistId} ORDER BY created_at ASC`;
  return rows.map(rowToNote);
}

export async function addNote(artistId: string, authorEmail: string, body: string): Promise<PmArtistNote> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`
    INSERT INTO pm_artist_notes (artist_id, author_email, body)
    VALUES (${artistId}, ${authorEmail}, ${body})
    RETURNING *
  `;
  return rowToNote(rows[0]);
}

// ---------- Meeting requests ----------

export type PmMeetingRequest = {
  id: string;
  artistId: string;
  artistName: string;
  requestedBy: string;
  comment: string;
  priority: string;
  suggestedDate: string | null;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  managementNotes: string | null;
  participantes: string | null;
  modalidad: string | null;
  direccionOLink: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToMeetingRequest(r: Record<string, unknown>): PmMeetingRequest {
  return {
    id: r.id as string,
    artistId: r.artist_id as string,
    artistName: r.artist_name as string,
    requestedBy: r.requested_by as string,
    comment: r.comment as string,
    priority: r.priority as string,
    suggestedDate: (r.suggested_date as string | null) ?? null,
    status: r.status as string,
    scheduledDate: (r.scheduled_date as string | null) ?? null,
    scheduledTime: (r.scheduled_time as string | null) ?? null,
    managementNotes: (r.management_notes as string | null) ?? null,
    participantes: (r.participantes as string | null) ?? null,
    modalidad: (r.modalidad as string | null) ?? null,
    direccionOLink: (r.direccion_o_link as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listMeetingRequestsForArtist(artistId: string): Promise<PmMeetingRequest[]> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`
    SELECT * FROM pm_meeting_requests WHERE artist_id = ${artistId} ORDER BY created_at DESC
  `;
  return rows.map(rowToMeetingRequest);
}

// Pending first (so Management sees what needs action at the top), newest first within each group.
export async function listAllMeetingRequests(): Promise<PmMeetingRequest[]> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`
    SELECT * FROM pm_meeting_requests ORDER BY (status = 'Pendiente') DESC, created_at DESC
  `;
  return rows.map(rowToMeetingRequest);
}

export async function createMeetingRequest(input: {
  artistId: string;
  artistName: string;
  requestedBy: string;
  comment: string;
  priority: string;
  suggestedDate: string | null;
}): Promise<PmMeetingRequest> {
  await ensurePmArtistWorkspaceSchema();
  const id = newId("mtg");
  const { rows } = await sql`
    INSERT INTO pm_meeting_requests (id, artist_id, artist_name, requested_by, comment, priority, suggested_date, status)
    VALUES (${id}, ${input.artistId}, ${input.artistName}, ${input.requestedBy}, ${input.comment}, ${input.priority}, ${input.suggestedDate}, 'Pendiente')
    RETURNING *
  `;
  return rowToMeetingRequest(rows[0]);
}

export async function updateMeetingRequest(
  id: string,
  patch: {
    status?: string; scheduledDate?: string | null; scheduledTime?: string | null; managementNotes?: string | null;
    participantes?: string | null; modalidad?: string | null; direccionOLink?: string | null; comment?: string;
  },
  actorEmail: string
): Promise<PmMeetingRequest | null> {
  await ensurePmArtistWorkspaceSchema();
  const current = await sql`SELECT * FROM pm_meeting_requests WHERE id = ${id}`;
  if (!current.rows[0]) return null;
  const existing = rowToMeetingRequest(current.rows[0]);
  const status = patch.status ?? existing.status;
  const scheduledDate = patch.scheduledDate !== undefined ? patch.scheduledDate : existing.scheduledDate;
  const scheduledTime = patch.scheduledTime !== undefined ? patch.scheduledTime : existing.scheduledTime;
  const managementNotes = patch.managementNotes !== undefined ? patch.managementNotes : existing.managementNotes;
  const participantes = patch.participantes !== undefined ? patch.participantes : existing.participantes;
  const modalidad = patch.modalidad !== undefined ? patch.modalidad : existing.modalidad;
  const direccionOLink = patch.direccionOLink !== undefined ? patch.direccionOLink : existing.direccionOLink;
  const comment = patch.comment !== undefined ? patch.comment : existing.comment;
  const { rows } = await sql`
    UPDATE pm_meeting_requests SET
      status = ${status},
      scheduled_date = ${scheduledDate},
      scheduled_time = ${scheduledTime},
      management_notes = ${managementNotes},
      participantes = ${participantes},
      modalidad = ${modalidad},
      direccion_o_link = ${direccionOLink},
      comment = ${comment},
      updated_by = ${actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToMeetingRequest(rows[0]);
}

export async function deleteMeetingRequest(id: string): Promise<void> {
  await ensurePmArtistWorkspaceSchema();
  await sql`DELETE FROM pm_meeting_requests WHERE id = ${id}`;
}

// ---------- Calendario "Reuniones de Management" ----------

export async function getMeetingRequest(id: string): Promise<PmMeetingRequest | null> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`SELECT * FROM pm_meeting_requests WHERE id = ${id}`;
  return rows[0] ? rowToMeetingRequest(rows[0]) : null;
}

// Para el grid semanal: por fecha "real" del evento — scheduled_date si ya
// está confirmada/realizada, si no suggested_date (así una solicitud con
// fecha propuesta igual aparece en el calendario, más tenue). Las que no
// tienen ninguna fecha (recién pedidas, sin sugerencia) no tienen dónde
// ubicarse en una grilla y siguen viéndose solo en la bandeja de pendientes
// de Management, sin cambios.
export async function listMeetingsInRange(startDate: string, endDate: string): Promise<PmMeetingRequest[]> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`
    SELECT * FROM pm_meeting_requests
    WHERE COALESCE(scheduled_date, suggested_date) BETWEEN ${startDate} AND ${endDate}
    ORDER BY COALESCE(scheduled_date, suggested_date) ASC, scheduled_time ASC NULLS LAST
  `;
  return rows.map(rowToMeetingRequest);
}

export async function listMeetingsInRangeForPm(startDate: string, endDate: string, pmEmail: string): Promise<PmMeetingRequest[]> {
  await ensurePmArtistWorkspaceSchema();
  const { rows } = await sql`
    SELECT * FROM pm_meeting_requests
    WHERE COALESCE(scheduled_date, suggested_date) BETWEEN ${startDate} AND ${endDate}
      AND requested_by = ${pmEmail}
    ORDER BY COALESCE(scheduled_date, suggested_date) ASC, scheduled_time ASC NULLS LAST
  `;
  return rows.map(rowToMeetingRequest);
}

// Alta directa desde el calendario de Management (a diferencia de
// createMeetingRequest, que es el pedido que arranca un PM) — nace
// 'Agendada' porque quien la crea ya eligió fecha/hora reales, no está
// "pidiendo" una.
export async function createManagementMeeting(input: {
  artistId: string;
  artistName: string;
  pmEmail: string;
  comment: string;
  scheduledDate: string;
  scheduledTime: string | null;
  participantes: string | null;
  modalidad: string | null;
  direccionOLink: string | null;
  actorEmail: string;
}): Promise<PmMeetingRequest> {
  await ensurePmArtistWorkspaceSchema();
  const id = newId("mtg");
  const { rows } = await sql`
    INSERT INTO pm_meeting_requests
      (id, artist_id, artist_name, requested_by, comment, priority, scheduled_date, scheduled_time, status,
       participantes, modalidad, direccion_o_link, updated_by, updated_at)
    VALUES
      (${id}, ${input.artistId}, ${input.artistName}, ${input.pmEmail}, ${input.comment}, 'Media',
       ${input.scheduledDate}, ${input.scheduledTime}, 'Agendada',
       ${input.participantes}, ${input.modalidad}, ${input.direccionOLink}, ${input.actorEmail}, now())
    RETURNING *
  `;
  return rowToMeetingRequest(rows[0]);
}
