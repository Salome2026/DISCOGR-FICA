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
    })();
  }
  return ready;
}

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
