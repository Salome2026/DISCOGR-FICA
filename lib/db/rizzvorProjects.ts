import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

// Rizzvor's A&R pre-production pipeline — tracks unreleased material
// (demos, works in progress) separately from Lanzamientos. A proyecto only
// becomes a real lanzamiento through the explicit "Convertir a lanzamiento"
// action (see claimConversion/finalizeConversion below), which reuses
// lib/db/releases.ts's createRelease/createGroupedRelease directly so a
// converted proyecto lands in pm_releases/catalog_tracks exactly like a
// release created by hand in the PM module.
export function ensureRizzvorProjectsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS rizzvor_projects (
          id TEXT PRIMARY KEY,
          artist_name TEXT NOT NULL,
          artist_photo_url TEXT,
          sello TEXT NOT NULL DEFAULT 'Rizzvor',
          genero TEXT,
          priority TEXT NOT NULL DEFAULT 'Media',
          status TEXT NOT NULL DEFAULT 'Demo',
          responsable_email TEXT,
          fecha_estimada DATE,
          hora_estimada TEXT,
          distribuidora TEXT,
          notas TEXT,
          converted_release_id BIGINT,
          converted_group_id BIGINT,
          converted_at TIMESTAMPTZ,
          converted_by TEXT,
          archived BOOLEAN NOT NULL DEFAULT false,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_projects_status_idx ON rizzvor_projects (status)`;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_projects_sello_idx ON rizzvor_projects (sello)`;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_projects_archived_idx ON rizzvor_projects (archived)`;

      await sql`
        CREATE TABLE IF NOT EXISTS rizzvor_project_songs (
          id BIGSERIAL PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES rizzvor_projects(id) ON DELETE CASCADE,
          track_number INTEGER NOT NULL DEFAULT 1,
          fonograma TEXT NOT NULL,
          artist_principal TEXT,
          colaboradores TEXT,
          productor TEXT,
          autores_compositores TEXT,
          isrc TEXT,
          comentario TEXT,
          status TEXT,
          audio_wav_file_id BIGINT,
          audio_preview_file_id BIGINT,
          portada_file_id BIGINT,
          converted_release_id BIGINT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_project_songs_project_idx ON rizzvor_project_songs (project_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS rizzvor_project_files (
          id BIGSERIAL PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES rizzvor_projects(id) ON DELETE CASCADE,
          song_id BIGINT REFERENCES rizzvor_project_songs(id) ON DELETE SET NULL,
          kind TEXT NOT NULL,
          url TEXT NOT NULL,
          file_name TEXT,
          content_type TEXT,
          size_bytes BIGINT,
          width INTEGER,
          height INTEGER,
          uploaded_by TEXT NOT NULL,
          uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_project_files_project_idx ON rizzvor_project_files (project_id)`;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_project_files_song_idx ON rizzvor_project_files (song_id)`;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_project_files_kind_idx ON rizzvor_project_files (kind)`;

      await sql`
        CREATE TABLE IF NOT EXISTS rizzvor_project_history (
          id BIGSERIAL PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES rizzvor_projects(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          actor_email TEXT NOT NULL,
          at TIMESTAMPTZ NOT NULL DEFAULT now(),
          detail TEXT
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_project_history_project_idx ON rizzvor_project_history (project_id)`;

      // Append-only by construction — no UPDATE/DELETE is ever exposed for
      // this table (see listComments/addComment below), matching "internal
      // comments, appended over time, not overwritten".
      await sql`
        CREATE TABLE IF NOT EXISTS rizzvor_project_comments (
          id BIGSERIAL PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES rizzvor_projects(id) ON DELETE CASCADE,
          author_email TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_project_comments_project_idx ON rizzvor_project_comments (project_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS rizzvor_project_checklist_items (
          id BIGSERIAL PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES rizzvor_projects(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          done BOOLEAN NOT NULL DEFAULT false,
          sort_order INTEGER NOT NULL DEFAULT 0,
          done_by TEXT,
          done_at TIMESTAMPTZ,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS rizzvor_checklist_project_idx ON rizzvor_project_checklist_items (project_id)`;
    })();
  }
  return ready;
}

// Plain TS arrays, not Postgres enums — adding/renaming a status is a
// one-line edit here, no migration.
export const RIZZVOR_PROJECT_STATUSES = [
  "Demo",
  "En producción",
  "Mezcla",
  "Master",
  "Portada pendiente",
  "Documentación pendiente",
  "Listo para distribuir",
  "Distribuido",
  "Lanzado",
] as const;
export type RizzvorProjectStatus = (typeof RIZZVOR_PROJECT_STATUSES)[number];

export const RIZZVOR_PROJECT_PRIORITIES = ["Alta", "Media", "Baja"] as const;
export type RizzvorProjectPriority = (typeof RIZZVOR_PROJECT_PRIORITIES)[number];

export const RIZZVOR_FILE_KINDS = [
  "foto_artista",
  "audio_preview",
  "audio_wav",
  "portada",
  "documento",
  "otro",
] as const;
export type RizzvorFileKind = (typeof RIZZVOR_FILE_KINDS)[number];

export const RIZZVOR_CHECKLIST_TEMPLATE = [
  "Portada final 3000×3000 aprobada",
  "Audio WAV master entregado",
  "Documentación de autoría/composición",
  "Créditos y metadata completos",
  "ISRC asignado",
] as const;

export type RizzvorProject = {
  id: string;
  artistName: string;
  artistPhotoUrl: string | null;
  sello: string;
  genero: string | null;
  priority: string;
  status: string;
  responsableEmail: string | null;
  fechaEstimada: string | null;
  horaEstimada: string | null;
  distribuidora: string | null;
  notas: string | null;
  convertedReleaseId: number | null;
  convertedGroupId: number | null;
  convertedAt: string | null;
  convertedBy: string | null;
  archived: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type RizzvorProjectSong = {
  id: number;
  projectId: string;
  trackNumber: number;
  fonograma: string;
  artistPrincipal: string | null;
  colaboradores: string | null;
  productor: string | null;
  autoresCompositores: string | null;
  isrc: string | null;
  comentario: string | null;
  status: string | null;
  audioWavFileId: number | null;
  audioPreviewFileId: number | null;
  portadaFileId: number | null;
  convertedReleaseId: number | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type RizzvorProjectFile = {
  id: number;
  projectId: string;
  songId: number | null;
  kind: string;
  url: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  uploadedBy: string;
  uploadedAt: string;
};

export type RizzvorProjectHistoryEntry = {
  id: number;
  projectId: string;
  action: string;
  actorEmail: string;
  at: string;
  detail: string | null;
};

export type RizzvorProjectComment = {
  id: number;
  projectId: string;
  authorEmail: string;
  body: string;
  createdAt: string;
};

export type RizzvorChecklistItem = {
  id: number;
  projectId: string;
  label: string;
  done: boolean;
  sortOrder: number;
  doneBy: string | null;
  doneAt: string | null;
  createdBy: string;
  createdAt: string;
};

function rowToProject(r: Record<string, unknown>): RizzvorProject {
  return {
    id: r.id as string,
    artistName: r.artist_name as string,
    artistPhotoUrl: (r.artist_photo_url as string | null) ?? null,
    sello: r.sello as string,
    genero: (r.genero as string | null) ?? null,
    priority: r.priority as string,
    status: r.status as string,
    responsableEmail: (r.responsable_email as string | null) ?? null,
    fechaEstimada: (r.fecha_estimada as string | null) ?? null,
    horaEstimada: (r.hora_estimada as string | null) ?? null,
    distribuidora: (r.distribuidora as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    convertedReleaseId: (r.converted_release_id as number | null) ?? null,
    convertedGroupId: (r.converted_group_id as number | null) ?? null,
    convertedAt: (r.converted_at as string | null) ?? null,
    convertedBy: (r.converted_by as string | null) ?? null,
    archived: !!r.archived,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function rowToSong(r: Record<string, unknown>): RizzvorProjectSong {
  return {
    id: Number(r.id),
    projectId: r.project_id as string,
    trackNumber: Number(r.track_number),
    fonograma: r.fonograma as string,
    artistPrincipal: (r.artist_principal as string | null) ?? null,
    colaboradores: (r.colaboradores as string | null) ?? null,
    productor: (r.productor as string | null) ?? null,
    autoresCompositores: (r.autores_compositores as string | null) ?? null,
    isrc: (r.isrc as string | null) ?? null,
    comentario: (r.comentario as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    audioWavFileId: r.audio_wav_file_id != null ? Number(r.audio_wav_file_id) : null,
    audioPreviewFileId: r.audio_preview_file_id != null ? Number(r.audio_preview_file_id) : null,
    portadaFileId: r.portada_file_id != null ? Number(r.portada_file_id) : null,
    convertedReleaseId: r.converted_release_id != null ? Number(r.converted_release_id) : null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function rowToFile(r: Record<string, unknown>): RizzvorProjectFile {
  return {
    id: Number(r.id),
    projectId: r.project_id as string,
    songId: r.song_id != null ? Number(r.song_id) : null,
    kind: r.kind as string,
    url: r.url as string,
    fileName: (r.file_name as string | null) ?? null,
    contentType: (r.content_type as string | null) ?? null,
    sizeBytes: r.size_bytes != null ? Number(r.size_bytes) : null,
    width: (r.width as number | null) ?? null,
    height: (r.height as number | null) ?? null,
    uploadedBy: r.uploaded_by as string,
    uploadedAt: r.uploaded_at as string,
  };
}

function rowToHistory(r: Record<string, unknown>): RizzvorProjectHistoryEntry {
  return {
    id: Number(r.id),
    projectId: r.project_id as string,
    action: r.action as string,
    actorEmail: r.actor_email as string,
    at: r.at as string,
    detail: (r.detail as string | null) ?? null,
  };
}

function rowToComment(r: Record<string, unknown>): RizzvorProjectComment {
  return {
    id: Number(r.id),
    projectId: r.project_id as string,
    authorEmail: r.author_email as string,
    body: r.body as string,
    createdAt: r.created_at as string,
  };
}

function rowToChecklistItem(r: Record<string, unknown>): RizzvorChecklistItem {
  return {
    id: Number(r.id),
    projectId: r.project_id as string,
    label: r.label as string,
    done: !!r.done,
    sortOrder: Number(r.sort_order),
    doneBy: (r.done_by as string | null) ?? null,
    doneAt: (r.done_at as string | null) ?? null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
  };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- History ----------

export async function logHistory(
  projectId: string,
  action: string,
  actorEmail: string,
  detail: string | null
): Promise<void> {
  await ensureRizzvorProjectsSchema();
  await sql`
    INSERT INTO rizzvor_project_history (project_id, action, actor_email, detail)
    VALUES (${projectId}, ${action}, ${actorEmail}, ${detail})
  `;
}

export async function getProjectHistory(projectId: string): Promise<RizzvorProjectHistoryEntry[]> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM rizzvor_project_history WHERE project_id = ${projectId} ORDER BY at DESC
  `;
  return rows.map(rowToHistory);
}

// ---------- Projects ----------

export async function listProjects(): Promise<RizzvorProject[]> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM rizzvor_projects WHERE archived = false ORDER BY created_at DESC
  `;
  return rows.map(rowToProject);
}

export async function getProject(id: string): Promise<RizzvorProject | null> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`SELECT * FROM rizzvor_projects WHERE id = ${id}`;
  return rows[0] ? rowToProject(rows[0]) : null;
}

export type ProjectInput = {
  artistName: string;
  sello: string;
  genero: string | null;
  priority: string;
  responsableEmail: string | null;
  fechaEstimada: string | null;
  horaEstimada: string | null;
  distribuidora: string | null;
  notas: string | null;
};

export async function createProject(input: ProjectInput, actorEmail: string): Promise<RizzvorProject> {
  await ensureRizzvorProjectsSchema();
  const id = newId("rzp");
  const { rows } = await sql`
    INSERT INTO rizzvor_projects
      (id, artist_name, sello, genero, priority, responsable_email, fecha_estimada, hora_estimada,
       distribuidora, notas, created_by, updated_by, updated_at)
    VALUES
      (${id}, ${input.artistName}, ${input.sello}, ${input.genero}, ${input.priority}, ${input.responsableEmail},
       ${input.fechaEstimada}, ${input.horaEstimada}, ${input.distribuidora}, ${input.notas},
       ${actorEmail}, ${actorEmail}, now())
    RETURNING *
  `;
  const project = rowToProject(rows[0]);

  for (const label of RIZZVOR_CHECKLIST_TEMPLATE) {
    await sql`
      INSERT INTO rizzvor_project_checklist_items (project_id, label, sort_order, created_by)
      VALUES (${id}, ${label}, ${RIZZVOR_CHECKLIST_TEMPLATE.indexOf(label)}, ${actorEmail})
    `;
  }

  await logHistory(id, "created", actorEmail, `Proyecto creado para ${input.artistName}`);
  return project;
}

export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
  actorEmail: string
): Promise<RizzvorProject | null> {
  await ensureRizzvorProjectsSchema();
  const current = await getProject(id);
  if (!current) return null;
  const next = { ...current, ...input };
  const { rows } = await sql`
    UPDATE rizzvor_projects SET
      artist_name = ${next.artistName},
      sello = ${next.sello},
      genero = ${next.genero},
      priority = ${next.priority},
      responsable_email = ${next.responsableEmail},
      fecha_estimada = ${next.fechaEstimada},
      hora_estimada = ${next.horaEstimada},
      distribuidora = ${next.distribuidora},
      notas = ${next.notas},
      updated_by = ${actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  await logHistory(id, "updated", actorEmail, "Datos del proyecto actualizados");
  return rows[0] ? rowToProject(rows[0]) : null;
}

export async function setProjectStatus(
  id: string,
  status: string,
  actorEmail: string
): Promise<RizzvorProject | null> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    UPDATE rizzvor_projects SET status = ${status}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return null;
  await logHistory(id, "status_changed", actorEmail, `Estado -> ${status}`);
  return rowToProject(rows[0]);
}

export async function archiveProject(id: string, actorEmail: string): Promise<void> {
  await ensureRizzvorProjectsSchema();
  await sql`UPDATE rizzvor_projects SET archived = true, updated_by = ${actorEmail}, updated_at = now() WHERE id = ${id}`;
  await logHistory(id, "archived", actorEmail, null);
}

export async function setArtistPhoto(projectId: string, fileId: number, actorEmail: string): Promise<void> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`SELECT url FROM rizzvor_project_files WHERE id = ${fileId} AND project_id = ${projectId}`;
  const url = rows[0]?.url as string | undefined;
  if (!url) return;
  await sql`
    UPDATE rizzvor_projects SET artist_photo_url = ${url}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${projectId}
  `;
  await logHistory(projectId, "updated", actorEmail, "Foto de artista actualizada");
}

// ---------- Songs ----------

export async function listSongs(projectId: string): Promise<RizzvorProjectSong[]> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM rizzvor_project_songs WHERE project_id = ${projectId} ORDER BY track_number ASC, id ASC
  `;
  return rows.map(rowToSong);
}

export type SongInput = {
  trackNumber: number;
  fonograma: string;
  artistPrincipal: string | null;
  colaboradores: string | null;
  productor: string | null;
  autoresCompositores: string | null;
  isrc: string | null;
  comentario: string | null;
  status: string | null;
};

export async function createSong(
  projectId: string,
  input: SongInput,
  actorEmail: string
): Promise<RizzvorProjectSong> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    INSERT INTO rizzvor_project_songs
      (project_id, track_number, fonograma, artist_principal, colaboradores, productor,
       autores_compositores, isrc, comentario, status, created_by, updated_by, updated_at)
    VALUES
      (${projectId}, ${input.trackNumber}, ${input.fonograma}, ${input.artistPrincipal}, ${input.colaboradores},
       ${input.productor}, ${input.autoresCompositores}, ${input.isrc}, ${input.comentario}, ${input.status},
       ${actorEmail}, ${actorEmail}, now())
    RETURNING *
  `;
  await logHistory(projectId, "song_added", actorEmail, `Canción agregada: ${input.fonograma}`);
  return rowToSong(rows[0]);
}

export async function updateSong(
  id: number,
  input: Partial<SongInput> & { audioWavFileId?: number | null; audioPreviewFileId?: number | null; portadaFileId?: number | null },
  actorEmail: string
): Promise<RizzvorProjectSong | null> {
  await ensureRizzvorProjectsSchema();
  const { rows: currentRows } = await sql`SELECT * FROM rizzvor_project_songs WHERE id = ${id}`;
  if (!currentRows[0]) return null;
  const current = rowToSong(currentRows[0]);
  const next = { ...current, ...input };
  const { rows } = await sql`
    UPDATE rizzvor_project_songs SET
      track_number = ${next.trackNumber},
      fonograma = ${next.fonograma},
      artist_principal = ${next.artistPrincipal},
      colaboradores = ${next.colaboradores},
      productor = ${next.productor},
      autores_compositores = ${next.autoresCompositores},
      isrc = ${next.isrc},
      comentario = ${next.comentario},
      status = ${next.status},
      audio_wav_file_id = ${next.audioWavFileId},
      audio_preview_file_id = ${next.audioPreviewFileId},
      portada_file_id = ${next.portadaFileId},
      updated_by = ${actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return null;
  await logHistory(current.projectId, "updated", actorEmail, `Canción actualizada: ${next.fonograma}`);
  return rowToSong(rows[0]);
}

export async function setSongStatus(id: number, status: string | null, actorEmail: string): Promise<RizzvorProjectSong | null> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    UPDATE rizzvor_project_songs SET status = ${status}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return null;
  const song = rowToSong(rows[0]);
  await logHistory(
    song.projectId,
    "song_status_changed",
    actorEmail,
    `Estado de "${song.fonograma}" -> ${status ?? "usa el estado del proyecto"}`
  );
  return song;
}

export async function deleteSong(id: number, actorEmail: string): Promise<void> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`SELECT * FROM rizzvor_project_songs WHERE id = ${id}`;
  if (!rows[0]) return;
  const song = rowToSong(rows[0]);
  await sql`DELETE FROM rizzvor_project_songs WHERE id = ${id}`;
  await logHistory(song.projectId, "song_removed", actorEmail, `Canción eliminada: ${song.fonograma}`);
}

// ---------- Files ----------

export async function listFiles(projectId: string): Promise<RizzvorProjectFile[]> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM rizzvor_project_files WHERE project_id = ${projectId} ORDER BY uploaded_at ASC
  `;
  return rows.map(rowToFile);
}

export type FileInput = {
  songId: number | null;
  kind: string;
  url: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
};

export async function addFile(projectId: string, input: FileInput, actorEmail: string): Promise<RizzvorProjectFile> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    INSERT INTO rizzvor_project_files
      (project_id, song_id, kind, url, file_name, content_type, size_bytes, width, height, uploaded_by)
    VALUES
      (${projectId}, ${input.songId}, ${input.kind}, ${input.url}, ${input.fileName}, ${input.contentType},
       ${input.sizeBytes}, ${input.width}, ${input.height}, ${actorEmail})
    RETURNING *
  `;
  await logHistory(projectId, "file_uploaded", actorEmail, `Archivo agregado (${input.kind}): ${input.fileName ?? input.url}`);
  return rowToFile(rows[0]);
}

export async function removeFile(id: number, actorEmail: string): Promise<void> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`SELECT * FROM rizzvor_project_files WHERE id = ${id}`;
  if (!rows[0]) return;
  const file = rowToFile(rows[0]);
  // DB row only — no underlying Vercel Blob delete, matching every other
  // module in this app (no del() call exists anywhere in the codebase).
  await sql`DELETE FROM rizzvor_project_files WHERE id = ${id}`;
  await logHistory(file.projectId, "file_removed", actorEmail, `Archivo eliminado (${file.kind}): ${file.fileName ?? file.url}`);
}

// ---------- Checklist ----------

export async function listChecklist(projectId: string): Promise<RizzvorChecklistItem[]> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM rizzvor_project_checklist_items WHERE project_id = ${projectId} ORDER BY sort_order ASC, id ASC
  `;
  return rows.map(rowToChecklistItem);
}

export async function addChecklistItem(projectId: string, label: string, actorEmail: string): Promise<RizzvorChecklistItem> {
  await ensureRizzvorProjectsSchema();
  const { rows: existing } = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM rizzvor_project_checklist_items WHERE project_id = ${projectId}
  `;
  const nextOrder = Number(existing[0]?.max_order ?? -1) + 1;
  const { rows } = await sql`
    INSERT INTO rizzvor_project_checklist_items (project_id, label, sort_order, created_by)
    VALUES (${projectId}, ${label}, ${nextOrder}, ${actorEmail})
    RETURNING *
  `;
  await logHistory(projectId, "checklist_toggled", actorEmail, `Ítem agregado: ${label}`);
  return rowToChecklistItem(rows[0]);
}

export async function toggleChecklistItem(id: number, done: boolean, actorEmail: string): Promise<RizzvorChecklistItem | null> {
  await ensureRizzvorProjectsSchema();
  const { rows } = done
    ? await sql`
        UPDATE rizzvor_project_checklist_items SET done = true, done_by = ${actorEmail}, done_at = now()
        WHERE id = ${id}
        RETURNING *
      `
    : await sql`
        UPDATE rizzvor_project_checklist_items SET done = false, done_by = NULL, done_at = NULL
        WHERE id = ${id}
        RETURNING *
      `;
  if (!rows[0]) return null;
  const item = rowToChecklistItem(rows[0]);
  await logHistory(item.projectId, "checklist_toggled", actorEmail, `${item.label} -> ${done ? "hecho" : "pendiente"}`);
  return item;
}

export async function removeChecklistItem(id: number, actorEmail: string): Promise<void> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`SELECT * FROM rizzvor_project_checklist_items WHERE id = ${id}`;
  if (!rows[0]) return;
  const item = rowToChecklistItem(rows[0]);
  await sql`DELETE FROM rizzvor_project_checklist_items WHERE id = ${id}`;
  await logHistory(item.projectId, "checklist_toggled", actorEmail, `Ítem eliminado: ${item.label}`);
}

// ---------- Comments (append-only) ----------

export async function listComments(projectId: string): Promise<RizzvorProjectComment[]> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    SELECT * FROM rizzvor_project_comments WHERE project_id = ${projectId} ORDER BY created_at ASC
  `;
  return rows.map(rowToComment);
}

export async function addComment(projectId: string, authorEmail: string, body: string): Promise<RizzvorProjectComment> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    INSERT INTO rizzvor_project_comments (project_id, author_email, body)
    VALUES (${projectId}, ${authorEmail}, ${body})
    RETURNING *
  `;
  await logHistory(projectId, "comment_added", authorEmail, null);
  return rowToComment(rows[0]);
}

// ---------- Conversion ----------

// Atomic claim: only succeeds once per project (WHERE converted_at IS NULL),
// so two people clicking "Convertir" at the same time can't both create a
// release. Call releaseConversionClaim() to roll back if release creation
// fails after the claim succeeds.
export async function claimConversion(id: string, actorEmail: string): Promise<boolean> {
  await ensureRizzvorProjectsSchema();
  const { rows } = await sql`
    UPDATE rizzvor_projects SET converted_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id} AND converted_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function finalizeConversion(
  id: string,
  info: { releaseId: number | null; groupId: number | null },
  actorEmail: string
): Promise<void> {
  await ensureRizzvorProjectsSchema();
  await sql`
    UPDATE rizzvor_projects SET
      converted_release_id = ${info.releaseId},
      converted_group_id = ${info.groupId},
      converted_at = now(),
      status = 'Distribuido',
      updated_by = ${actorEmail},
      updated_at = now()
    WHERE id = ${id}
  `;
  await logHistory(id, "converted", actorEmail, "Convertido a lanzamiento");
}

export async function releaseConversionClaim(id: string): Promise<void> {
  await ensureRizzvorProjectsSchema();
  await sql`UPDATE rizzvor_projects SET converted_by = NULL WHERE id = ${id} AND converted_at IS NULL`;
}

export async function setSongConvertedRelease(songId: number, releaseId: number): Promise<void> {
  await ensureRizzvorProjectsSchema();
  await sql`UPDATE rizzvor_project_songs SET converted_release_id = ${releaseId} WHERE id = ${songId}`;
}
