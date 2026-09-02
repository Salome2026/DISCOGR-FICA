import { sql } from "@vercel/postgres";
import { recordAudit, getAuditLog, type AuditEntry } from "@/lib/db/users";
import { ensureArtistExists } from "@/lib/db/artists";
import { hasPermission, type SessionUser } from "@/lib/permissions";

let ready: Promise<void> | null = null;

export function ensurePmArtistAssignmentsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS pm_roster_assignments (
          artist_id TEXT PRIMARY KEY,
          artist_name TEXT NOT NULL,
          pm_email TEXT NOT NULL,
          assigned_by TEXT NOT NULL,
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_roster_assignments_pm_idx ON pm_roster_assignments (pm_email)`;
      // Foto propia de la asignación, no del artista — necesaria para las
      // "unidades" (streaming, sello) que a propósito nunca tienen fila en
      // `artists` (ver skipArtistRegistry más abajo), así que no tienen de
      // dónde heredar una foto real. Para un artista real de verdad, esto
      // queda NULL y se sigue usando artists.photo_url (ver el enriquecido
      // en app/api/pm/artistas/route.ts).
      await sql`ALTER TABLE pm_roster_assignments ADD COLUMN IF NOT EXISTS photo_url TEXT`;
      // Secondary PMs on a shared project (e.g. two PMs covering the same
      // artist) — additive on top of the single "owner" row above, so the
      // owner concept (transfer history, one canonical assignment) stays
      // simple while still letting more than one PM read/write the exact
      // same pm_artist_profiles/pm_annual_plans/etc. rows (those are keyed
      // only by artist_id, never by pm_email, so no data ever duplicates).
      await sql`
        CREATE TABLE IF NOT EXISTS pm_roster_collaborators (
          artist_id TEXT NOT NULL,
          pm_email TEXT NOT NULL,
          added_by TEXT NOT NULL,
          added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (artist_id, pm_email)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS pm_roster_collaborators_pm_idx ON pm_roster_collaborators (pm_email)`;
    })();
  }
  return ready;
}

export type PmRosterAssignment = {
  artistId: string;
  artistName: string;
  pmEmail: string;
  assignedBy: string;
  assignedAt: string;
  photoUrl: string | null;
  role: "owner" | "collaborator";
};

function rowToAssignment(r: Record<string, unknown>): PmRosterAssignment {
  return {
    artistId: r.artist_id as string,
    artistName: r.artist_name as string,
    pmEmail: r.pm_email as string,
    assignedBy: r.assigned_by as string,
    assignedAt: r.assigned_at as string,
    photoUrl: (r.photo_url as string) ?? null,
    role: "owner",
  };
}

// Foto propia de una asignación — pensada para las "unidades" sin fila de
// artista real, pero funciona igual para cualquier artist_id.
export async function setAssignmentPhoto(artistId: string, photoUrl: string | null, actorEmail: string): Promise<void> {
  await ensurePmArtistAssignmentsSchema();
  await sql`UPDATE pm_roster_assignments SET photo_url = ${photoUrl} WHERE artist_id = ${artistId}`;
  await recordAudit({ actorEmail, action: "pm_roster_assignment_photo_updated", entityType: "pm_roster_assignment", entityId: artistId, after: { photoUrl } });
}

export async function getAssignment(artistId: string): Promise<PmRosterAssignment | null> {
  await ensurePmArtistAssignmentsSchema();
  const { rows } = await sql`SELECT * FROM pm_roster_assignments WHERE artist_id = ${artistId}`;
  return rows[0] ? rowToAssignment(rows[0]) : null;
}

// Owner rows plus any shared/collaborator rows for this PM — a shared
// project (e.g. two PMs on the same artist) shows up on both PMs' "Mis
// Artistas" list, pointing at the exact same underlying workspace data.
export async function listAssignmentsForPm(pmEmail: string): Promise<PmRosterAssignment[]> {
  await ensurePmArtistAssignmentsSchema();
  const { rows: ownRows } = await sql`SELECT * FROM pm_roster_assignments WHERE pm_email = ${pmEmail}`;
  const { rows: collabRows } = await sql`
    SELECT a.* FROM pm_roster_assignments a
    JOIN pm_roster_collaborators c ON c.artist_id = a.artist_id
    WHERE c.pm_email = ${pmEmail}
  `;
  const owned = ownRows.map(rowToAssignment);
  const collaborating = collabRows.map((r) => ({ ...rowToAssignment(r), role: "collaborator" as const }));
  return [...owned, ...collaborating].sort((a, b) => a.artistName.localeCompare(b.artistName));
}

export async function listCollaboratorsForArtist(artistId: string): Promise<string[]> {
  await ensurePmArtistAssignmentsSchema();
  const { rows } = await sql`SELECT pm_email FROM pm_roster_collaborators WHERE artist_id = ${artistId} ORDER BY pm_email ASC`;
  return rows.map((r) => r.pm_email as string);
}

export async function addCollaborator(artistId: string, pmEmail: string, actorEmail: string): Promise<void> {
  await ensurePmArtistAssignmentsSchema();
  await sql`
    INSERT INTO pm_roster_collaborators (artist_id, pm_email, added_by)
    VALUES (${artistId}, ${pmEmail}, ${actorEmail})
    ON CONFLICT (artist_id, pm_email) DO NOTHING
  `;
  await recordAudit({
    actorEmail,
    action: "pm_roster_collaborator_added",
    entityType: "pm_roster_assignment",
    entityId: artistId,
    after: { collaboratorEmail: pmEmail },
  });
}

export async function removeCollaborator(artistId: string, pmEmail: string, actorEmail: string): Promise<void> {
  await ensurePmArtistAssignmentsSchema();
  await sql`DELETE FROM pm_roster_collaborators WHERE artist_id = ${artistId} AND pm_email = ${pmEmail}`;
  await recordAudit({
    actorEmail,
    action: "pm_roster_collaborator_removed",
    entityType: "pm_roster_assignment",
    entityId: artistId,
    before: { collaboratorEmail: pmEmail },
  });
}

export async function listAllAssignments(): Promise<PmRosterAssignment[]> {
  await ensurePmArtistAssignmentsSchema();
  const { rows } = await sql`SELECT * FROM pm_roster_assignments ORDER BY artist_name ASC`;
  return rows.map(rowToAssignment);
}

// Single atomic upsert — handles both "assign new" and "transfer" since
// artist_id is the PK. Calls ensureArtistExists first so a static-roster-only
// artist always gets a real row the moment it's assigned (the workspace
// pages in lib/db/pmArtistWorkspace.ts depend on getArtist(id) resolving).
// Records its own audit entry — every caller gets history for free.
export async function upsertAssignment(
  input: { artistId: string; artistName: string; pmEmail: string; reason: string | null; skipArtistRegistry?: boolean },
  actorEmail: string
): Promise<PmRosterAssignment> {
  await ensurePmArtistAssignmentsSchema();
  // Non-artist "units" (a streaming project, a sello) reuse this same table
  // and workspace tooling for their PM's Plan Anual/Calendario/etc., but must
  // never get a row in `artists` — that table feeds artist pickers all over
  // the app (Tour Manager, releases, booking, legal...), and a unit showing
  // up there as a selectable "artist" would be a real, confusing bug.
  if (!input.skipArtistRegistry) {
    await ensureArtistExists(input.artistId, input.artistName, actorEmail);
  }
  const previous = await getAssignment(input.artistId);
  const { rows } = await sql`
    INSERT INTO pm_roster_assignments (artist_id, artist_name, pm_email, assigned_by, assigned_at)
    VALUES (${input.artistId}, ${input.artistName}, ${input.pmEmail}, ${actorEmail}, now())
    ON CONFLICT (artist_id) DO UPDATE SET
      artist_name = EXCLUDED.artist_name,
      pm_email = EXCLUDED.pm_email,
      assigned_by = EXCLUDED.assigned_by,
      assigned_at = now()
    RETURNING *
  `;
  await recordAudit({
    actorEmail,
    action: previous ? "pm_roster_assignment_transferred" : "pm_roster_assignment_created",
    entityType: "pm_roster_assignment",
    entityId: input.artistId,
    before: { pmEmail: previous?.pmEmail ?? null },
    after: { pmEmail: input.pmEmail },
    detail: input.reason,
  });
  return rowToAssignment(rows[0]);
}

export async function removeAssignment(artistId: string, reason: string, actorEmail: string): Promise<void> {
  await ensurePmArtistAssignmentsSchema();
  const previous = await getAssignment(artistId);
  await sql`DELETE FROM pm_roster_assignments WHERE artist_id = ${artistId}`;
  await recordAudit({
    actorEmail,
    action: "pm_roster_assignment_revoked",
    entityType: "pm_roster_assignment",
    entityId: artistId,
    before: { pmEmail: previous?.pmEmail ?? null },
    after: { pmEmail: null },
    detail: reason,
  });
}

export async function isArtistAssignedToPm(pmEmail: string, artistName: string): Promise<boolean> {
  await ensurePmArtistAssignmentsSchema();
  const { rows } = await sql`
    SELECT 1 FROM pm_roster_assignments a
    WHERE lower(a.artist_name) = lower(${artistName})
      AND (a.pm_email = ${pmEmail} OR EXISTS (
        SELECT 1 FROM pm_roster_collaborators c WHERE c.artist_id = a.artist_id AND c.pm_email = ${pmEmail}
      ))
  `;
  return rows.length > 0;
}

export async function canPmAccessArtist(
  user: { email: string; roles: string[] },
  artistId: string
): Promise<boolean> {
  if (user.roles.includes("admin")) return true;
  if (!user.roles.includes("project_manager")) return false;
  const assignment = await getAssignment(artistId);
  if (assignment?.pmEmail === user.email) return true;
  const collaborators = await listCollaboratorsForArtist(artistId);
  return collaborators.includes(user.email);
}

// Read access for the Plan Anual family of routes: the owning PM, or
// Management (they need to read it to write their own observaciones and to
// download the PDF for meetings), or admin.
export async function canViewAnnualPlan(user: SessionUser, artistId: string): Promise<boolean> {
  if (hasPermission(user, "ver_management")) return true;
  return canPmAccessArtist({ email: user.email, roles: user.roles }, artistId);
}

// Reuses the platform's generic audit log rather than a bespoke history
// table — same pattern already proven for addRole()/removeRole()/assignToPm().
export async function getAssignmentHistory(artistId: string): Promise<AuditEntry[]> {
  return getAuditLog({ entityType: "pm_roster_assignment", entityId: artistId });
}
