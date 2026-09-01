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
};

function rowToAssignment(r: Record<string, unknown>): PmRosterAssignment {
  return {
    artistId: r.artist_id as string,
    artistName: r.artist_name as string,
    pmEmail: r.pm_email as string,
    assignedBy: r.assigned_by as string,
    assignedAt: r.assigned_at as string,
  };
}

export async function getAssignment(artistId: string): Promise<PmRosterAssignment | null> {
  await ensurePmArtistAssignmentsSchema();
  const { rows } = await sql`SELECT * FROM pm_roster_assignments WHERE artist_id = ${artistId}`;
  return rows[0] ? rowToAssignment(rows[0]) : null;
}

export async function listAssignmentsForPm(pmEmail: string): Promise<PmRosterAssignment[]> {
  await ensurePmArtistAssignmentsSchema();
  const { rows } = await sql`SELECT * FROM pm_roster_assignments WHERE pm_email = ${pmEmail} ORDER BY artist_name ASC`;
  return rows.map(rowToAssignment);
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
  input: { artistId: string; artistName: string; pmEmail: string; reason: string | null },
  actorEmail: string
): Promise<PmRosterAssignment> {
  await ensurePmArtistAssignmentsSchema();
  await ensureArtistExists(input.artistId, input.artistName, actorEmail);
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
    SELECT 1 FROM pm_roster_assignments
    WHERE pm_email = ${pmEmail} AND lower(artist_name) = lower(${artistName})
  `;
  return rows.length > 0;
}

export async function canPmAccessArtist(
  user: { email: string; role: string | null },
  artistId: string
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role !== "project_manager") return false;
  const assignment = await getAssignment(artistId);
  return assignment?.pmEmail === user.email;
}

// Read access for the Plan Anual family of routes: the owning PM, or
// Management (they need to read it to write their own observaciones and to
// download the PDF for meetings), or admin.
export async function canViewAnnualPlan(user: SessionUser, artistId: string): Promise<boolean> {
  if (hasPermission(user, "ver_management")) return true;
  return canPmAccessArtist({ email: user.email, role: user.role }, artistId);
}

// Reuses the platform's generic audit log rather than a bespoke history
// table — same pattern already proven for updateUserRole()/assignToPm().
export async function getAssignmentHistory(artistId: string): Promise<AuditEntry[]> {
  return getAuditLog({ entityType: "pm_roster_assignment", entityId: artistId });
}
