import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog, type AuditEntry } from "@/lib/db/users";

// Same shape as lib/db/pmArtistAssignments.ts (owner + collaborators, no
// duplication of workspace data) applied to CM accounts instead of artists —
// deliberately a separate, parallel set of tables rather than generalizing
// the PM ones, matching this project's established "own module, own tables"
// isolation convention (see A&R/Legal/Booking/Tour Manager).

let ready: Promise<void> | null = null;

export function ensureCmAccountsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS cm_accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          platform TEXT NOT NULL,
          handle TEXT,
          url TEXT,
          photo_url TEXT,
          linked_artist_id TEXT,
          sello TEXT,
          frecuencia_publicacion_acordada TEXT,
          active BOOLEAN NOT NULL DEFAULT true,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS cm_accounts_artist_idx ON cm_accounts (linked_artist_id)`;
      await sql`CREATE INDEX IF NOT EXISTS cm_accounts_sello_idx ON cm_accounts (sello)`;

      await sql`
        CREATE TABLE IF NOT EXISTS cm_account_assignments (
          account_id TEXT PRIMARY KEY REFERENCES cm_accounts(id) ON DELETE CASCADE,
          cm_email TEXT NOT NULL,
          assigned_by TEXT NOT NULL,
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS cm_account_assignments_cm_idx ON cm_account_assignments (cm_email)`;

      await sql`
        CREATE TABLE IF NOT EXISTS cm_account_collaborators (
          account_id TEXT NOT NULL REFERENCES cm_accounts(id) ON DELETE CASCADE,
          cm_email TEXT NOT NULL,
          added_by TEXT NOT NULL,
          added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (account_id, cm_email)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS cm_account_collaborators_cm_idx ON cm_account_collaborators (cm_email)`;

      // Append-only observaciones sobre una cuenta — mismo patrón que
      // pm_artist_notes / rizzvor_project_comments.
      await sql`
        CREATE TABLE IF NOT EXISTS cm_account_notes (
          id BIGSERIAL PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES cm_accounts(id) ON DELETE CASCADE,
          author_email TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  return ready;
}

export type CmAccount = {
  id: string;
  name: string;
  platform: string;
  handle: string | null;
  url: string | null;
  linkedArtistId: string | null;
  sello: string | null;
  frecuenciaPublicacionAcordada: string | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToAccount(r: Record<string, unknown>): CmAccount {
  return {
    id: r.id as string,
    name: r.name as string,
    platform: r.platform as string,
    handle: (r.handle as string) ?? null,
    url: (r.url as string) ?? null,
    linkedArtistId: (r.linked_artist_id as string) ?? null,
    sello: (r.sello as string) ?? null,
    frecuenciaPublicacionAcordada: (r.frecuencia_publicacion_acordada as string) ?? null,
    active: r.active as boolean,
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  };
}

export async function createAccount(input: {
  id: string;
  name: string;
  platform: string;
  handle: string | null;
  url: string | null;
  linkedArtistId: string | null;
  sello: string | null;
  frecuenciaPublicacionAcordada: string | null;
  createdBy: string;
}): Promise<CmAccount> {
  await ensureCmAccountsSchema();
  const { rows } = await sql`
    INSERT INTO cm_accounts (id, name, platform, handle, url, linked_artist_id, sello, frecuencia_publicacion_acordada, created_by)
    VALUES (${input.id}, ${input.name}, ${input.platform}, ${input.handle}, ${input.url}, ${input.linkedArtistId}, ${input.sello}, ${input.frecuenciaPublicacionAcordada}, ${input.createdBy})
    RETURNING *
  `;
  await recordAudit({ actorEmail: input.createdBy, action: "cm_account_created", entityType: "cm_account", entityId: input.id });
  return rowToAccount(rows[0]);
}

export async function updateAccount(
  id: string,
  patch: Partial<{ name: string; platform: string; handle: string | null; url: string | null; sello: string | null; frecuenciaPublicacionAcordada: string | null; active: boolean }>,
  actorEmail: string
): Promise<void> {
  await ensureCmAccountsSchema();
  const current = await getAccount(id);
  if (!current) return;
  await sql`
    UPDATE cm_accounts SET
      name = ${patch.name ?? current.name},
      platform = ${patch.platform ?? current.platform},
      handle = ${patch.handle !== undefined ? patch.handle : current.handle},
      url = ${patch.url !== undefined ? patch.url : current.url},
      sello = ${patch.sello !== undefined ? patch.sello : current.sello},
      frecuencia_publicacion_acordada = ${patch.frecuenciaPublicacionAcordada !== undefined ? patch.frecuenciaPublicacionAcordada : current.frecuenciaPublicacionAcordada},
      active = ${patch.active ?? current.active},
      updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function getAccount(id: string): Promise<CmAccount | null> {
  await ensureCmAccountsSchema();
  const { rows } = await sql`SELECT * FROM cm_accounts WHERE id = ${id}`;
  return rows[0] ? rowToAccount(rows[0]) : null;
}

export async function listAllAccounts(): Promise<CmAccount[]> {
  await ensureCmAccountsSchema();
  const { rows } = await sql`SELECT * FROM cm_accounts WHERE active = true ORDER BY name ASC`;
  return rows.map(rowToAccount);
}

// Todas las cuentas vinculadas a un artista puntual — la "vista por
// artista" agrega estas cuentas (puede ser más de una red por artista),
// a diferencia de listAccountsBySelloOrArtist que también matchea por
// sello (usada para enrutar lanzamientos, no para esta vista).
export async function listAccountsForArtist(artistId: string): Promise<CmAccount[]> {
  await ensureCmAccountsSchema();
  const { rows } = await sql`SELECT * FROM cm_accounts WHERE linked_artist_id = ${artistId} AND active = true ORDER BY name ASC`;
  return rows.map(rowToAccount);
}

export async function listAccountsBySelloOrArtist(sello: string | null, artistId: string | null): Promise<CmAccount[]> {
  await ensureCmAccountsSchema();
  const { rows } = await sql`
    SELECT * FROM cm_accounts
    WHERE active = true AND ((${sello}::text IS NOT NULL AND sello = ${sello}) OR (${artistId}::text IS NOT NULL AND linked_artist_id = ${artistId}))
  `;
  return rows.map(rowToAccount);
}

export type CmAccountAssignment = { accountId: string; cmEmail: string; role: "owner" | "collaborator" };

// Calcado de listAssignmentsForPm() en lib/db/pmArtistAssignments.ts —
// dueño + colaboradores compartidos, sin duplicar ninguna fila de contenido.
export async function listAccountsForCm(cmEmail: string): Promise<(CmAccount & { role: "owner" | "collaborator" })[]> {
  await ensureCmAccountsSchema();
  const { rows: ownRows } = await sql`
    SELECT a.* FROM cm_accounts a
    JOIN cm_account_assignments x ON x.account_id = a.id
    WHERE x.cm_email = ${cmEmail} AND a.active = true
  `;
  const { rows: collabRows } = await sql`
    SELECT a.* FROM cm_accounts a
    JOIN cm_account_collaborators c ON c.account_id = a.id
    WHERE c.cm_email = ${cmEmail} AND a.active = true
  `;
  const owned = ownRows.map((r) => ({ ...rowToAccount(r), role: "owner" as const }));
  const collaborating = collabRows.map((r) => ({ ...rowToAccount(r), role: "collaborator" as const }));
  return [...owned, ...collaborating].sort((a, b) => a.name.localeCompare(b.name));
}

export async function canCmAccessAccount(user: { email: string; roles: string[] }, accountId: string): Promise<boolean> {
  if (user.roles.includes("admin") || user.roles.includes("management")) return true;
  if (!user.roles.includes("community_manager")) return false;
  await ensureCmAccountsSchema();
  const { rows } = await sql`
    SELECT 1 FROM cm_account_assignments WHERE account_id = ${accountId} AND cm_email = ${user.email}
    UNION
    SELECT 1 FROM cm_account_collaborators WHERE account_id = ${accountId} AND cm_email = ${user.email}
  `;
  return rows.length > 0;
}

export async function getAccountAssignment(accountId: string): Promise<{ cmEmail: string } | null> {
  await ensureCmAccountsSchema();
  const { rows } = await sql`SELECT cm_email FROM cm_account_assignments WHERE account_id = ${accountId}`;
  return rows[0] ? { cmEmail: rows[0].cm_email as string } : null;
}

export async function listCollaboratorsForAccount(accountId: string): Promise<string[]> {
  await ensureCmAccountsSchema();
  const { rows } = await sql`SELECT cm_email FROM cm_account_collaborators WHERE account_id = ${accountId} ORDER BY cm_email ASC`;
  return rows.map((r) => r.cm_email as string);
}

// Único atómico — asignar y transferir son la misma operación, PK en
// account_id garantiza un solo dueño a la vez.
export async function upsertAccountAssignment(accountId: string, cmEmail: string, reason: string | null, actorEmail: string): Promise<void> {
  await ensureCmAccountsSchema();
  const previous = await getAccountAssignment(accountId);
  await sql`
    INSERT INTO cm_account_assignments (account_id, cm_email, assigned_by)
    VALUES (${accountId}, ${cmEmail}, ${actorEmail})
    ON CONFLICT (account_id) DO UPDATE SET cm_email = EXCLUDED.cm_email, assigned_by = EXCLUDED.assigned_by, assigned_at = now()
  `;
  await recordAudit({
    actorEmail,
    action: previous ? "cm_account_assignment_transferred" : "cm_account_assignment_created",
    entityType: "cm_account_assignment",
    entityId: accountId,
    before: { cmEmail: previous?.cmEmail ?? null },
    after: { cmEmail },
    detail: reason,
  });
}

export async function removeAccountAssignment(accountId: string, reason: string, actorEmail: string): Promise<void> {
  await ensureCmAccountsSchema();
  const previous = await getAccountAssignment(accountId);
  await sql`DELETE FROM cm_account_assignments WHERE account_id = ${accountId}`;
  await recordAudit({
    actorEmail,
    action: "cm_account_assignment_revoked",
    entityType: "cm_account_assignment",
    entityId: accountId,
    before: { cmEmail: previous?.cmEmail ?? null },
    after: { cmEmail: null },
    detail: reason,
  });
}

export async function addCollaborator(accountId: string, cmEmail: string, actorEmail: string): Promise<void> {
  await ensureCmAccountsSchema();
  await sql`
    INSERT INTO cm_account_collaborators (account_id, cm_email, added_by)
    VALUES (${accountId}, ${cmEmail}, ${actorEmail})
    ON CONFLICT (account_id, cm_email) DO NOTHING
  `;
  await recordAudit({ actorEmail, action: "cm_account_collaborator_added", entityType: "cm_account_assignment", entityId: accountId, after: { collaboratorEmail: cmEmail } });
}

export async function removeCollaborator(accountId: string, cmEmail: string, actorEmail: string): Promise<void> {
  await ensureCmAccountsSchema();
  await sql`DELETE FROM cm_account_collaborators WHERE account_id = ${accountId} AND cm_email = ${cmEmail}`;
  await recordAudit({ actorEmail, action: "cm_account_collaborator_removed", entityType: "cm_account_assignment", entityId: accountId, before: { collaboratorEmail: cmEmail } });
}

export async function getAccountAssignmentHistory(accountId: string): Promise<AuditEntry[]> {
  return getAuditLog({ entityType: "cm_account_assignment", entityId: accountId });
}

export async function addAccountNote(accountId: string, authorEmail: string, body: string): Promise<void> {
  await ensureCmAccountsSchema();
  await sql`INSERT INTO cm_account_notes (account_id, author_email, body) VALUES (${accountId}, ${authorEmail}, ${body})`;
}

export async function listAccountNotes(accountId: string) {
  await ensureCmAccountsSchema();
  const { rows } = await sql`SELECT * FROM cm_account_notes WHERE account_id = ${accountId} ORDER BY created_at DESC`;
  return rows;
}
