import { sql } from "@vercel/postgres";
import { recordAudit } from "@/lib/db/users";
import type {
  ArOpportunity,
  ArOpportunityComment,
  ArOpportunityAssignment,
  ArOpportunityInput,
  ArOpportunityUpdate,
  ArCompatibility,
  ArNarrative,
  ArScoreBreakdown,
  ArSource,
  ArTaskStatus,
} from "@discografica/shared/types/ar";

let ready: Promise<void> | null = null;

export function ensureArOpportunitiesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ar_opportunities (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'NUEVO',
          opportunity_score INTEGER,
          scoring_version TEXT,
          score_breakdown JSONB,
          subject_type TEXT NOT NULL,
          subject_key TEXT,
          subject_name TEXT NOT NULL,
          region_focus TEXT NOT NULL DEFAULT 'AR',
          related_label_artist TEXT,
          suggested_sello TEXT,
          metrics JSONB,
          compatibility JSONB,
          narrative JSONB,
          sources JSONB NOT NULL DEFAULT '[]',
          data_unavailable_note TEXT,
          source_type TEXT NOT NULL,
          assigned_pm_email TEXT,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ,
          archived BOOLEAN NOT NULL DEFAULT false
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS ar_opportunities_status_idx ON ar_opportunities (status)`;
      await sql`CREATE INDEX IF NOT EXISTS ar_opportunities_category_idx ON ar_opportunities (category)`;
      await sql`CREATE INDEX IF NOT EXISTS ar_opportunities_subject_idx ON ar_opportunities (subject_type, subject_key)`;
      await sql`CREATE INDEX IF NOT EXISTS ar_opportunities_created_idx ON ar_opportunities (created_at DESC)`;

      // Append-only by construction — no UPDATE/DELETE is ever exposed,
      // same convention as rizzvor_project_comments.
      await sql`
        CREATE TABLE IF NOT EXISTS ar_opportunity_comments (
          id BIGSERIAL PRIMARY KEY,
          opportunity_id TEXT NOT NULL REFERENCES ar_opportunities(id) ON DELETE CASCADE,
          author_email TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      // Both the "send to PM with a comment + task" action and the join
      // that scopes what a project_manager sees in listOpportunitiesFor()
      // — not a mirror of pm_artist_assignments (that's static ownership;
      // this is a task record with its own state).
      await sql`
        CREATE TABLE IF NOT EXISTS ar_opportunity_assignments (
          id BIGSERIAL PRIMARY KEY,
          opportunity_id TEXT NOT NULL REFERENCES ar_opportunities(id) ON DELETE CASCADE,
          pm_email TEXT NOT NULL,
          assigned_by TEXT NOT NULL,
          comment TEXT,
          task_status TEXT NOT NULL DEFAULT 'pending',
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          completed_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS ar_opportunity_assignments_pm_idx ON ar_opportunity_assignments (pm_email, task_status)`;
      await sql`CREATE INDEX IF NOT EXISTS ar_opportunity_assignments_opp_idx ON ar_opportunity_assignments (opportunity_id)`;
    })();
  }
  return ready;
}

function rowToOpportunity(r: Record<string, unknown>): ArOpportunity {
  return {
    id: r.id as string,
    category: r.category as ArOpportunity["category"],
    title: r.title as string,
    status: r.status as ArOpportunity["status"],
    opportunityScore: (r.opportunity_score as number | null) ?? null,
    scoringVersion: (r.scoring_version as string | null) ?? null,
    scoreBreakdown: (r.score_breakdown as ArScoreBreakdown | null) ?? null,
    subjectType: r.subject_type as ArOpportunity["subjectType"],
    subjectKey: (r.subject_key as string | null) ?? null,
    subjectName: r.subject_name as string,
    regionFocus: r.region_focus as ArOpportunity["regionFocus"],
    relatedLabelArtist: (r.related_label_artist as string | null) ?? null,
    suggestedSello: (r.suggested_sello as string | null) ?? null,
    metrics: (r.metrics as Record<string, unknown> | null) ?? null,
    compatibility: (r.compatibility as ArCompatibility | null) ?? null,
    narrative: (r.narrative as ArNarrative | null) ?? null,
    sources: (r.sources as ArSource[] | null) ?? [],
    dataUnavailableNote: (r.data_unavailable_note as string | null) ?? null,
    sourceType: r.source_type as ArOpportunity["sourceType"],
    assignedPmEmail: (r.assigned_pm_email as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
    archived: r.archived as boolean,
  };
}

function rowToComment(r: Record<string, unknown>): ArOpportunityComment {
  return {
    id: r.id as number,
    opportunityId: r.opportunity_id as string,
    authorEmail: r.author_email as string,
    body: r.body as string,
    createdAt: r.created_at as string,
  };
}

function rowToAssignment(r: Record<string, unknown>): ArOpportunityAssignment {
  return {
    id: r.id as number,
    opportunityId: r.opportunity_id as string,
    pmEmail: r.pm_email as string,
    assignedBy: r.assigned_by as string,
    comment: (r.comment as string | null) ?? null,
    taskStatus: r.task_status as ArTaskStatus,
    assignedAt: r.assigned_at as string,
    completedAt: (r.completed_at as string | null) ?? null,
  };
}

function newId(): string {
  return `aro-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// admin + role "ar" see every non-archived opportunity; project_manager
// sees only what's been assigned to them — this branch is the reason the
// scoping can't live in a static permission, it depends on the assignments
// table. Same shape as listReleasesFor() in lib/db/releases.ts.
export async function listOpportunitiesFor(email: string, roles: string[]): Promise<ArOpportunity[]> {
  await ensureArOpportunitiesSchema();
  if (roles.includes("admin") || roles.includes("ar")) {
    const { rows } = await sql`
      SELECT * FROM ar_opportunities WHERE archived = false ORDER BY created_at DESC
    `;
    return rows.map(rowToOpportunity);
  }
  const { rows } = await sql`
    SELECT o.* FROM ar_opportunities o
    WHERE o.archived = false
      AND EXISTS (
        SELECT 1 FROM ar_opportunity_assignments a
        WHERE a.opportunity_id = o.id AND a.pm_email = ${email}
      )
    ORDER BY o.created_at DESC
  `;
  return rows.map(rowToOpportunity);
}

export async function getOpportunity(id: string): Promise<ArOpportunity | null> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`SELECT * FROM ar_opportunities WHERE id = ${id}`;
  return rows[0] ? rowToOpportunity(rows[0]) : null;
}

export async function createManualOpportunity(input: ArOpportunityInput, actorEmail: string): Promise<ArOpportunity> {
  await ensureArOpportunitiesSchema();
  const id = newId();
  await sql`
    INSERT INTO ar_opportunities
      (id, category, title, status, subject_type, subject_key, subject_name, region_focus,
       suggested_sello, sources, data_unavailable_note, source_type, created_by, updated_by)
    VALUES
      (${id}, ${input.category}, ${input.title}, 'NUEVO', ${input.subjectType}, ${input.subjectKey ?? null},
       ${input.subjectName}, ${input.regionFocus ?? "AR"}, ${input.suggestedSello ?? null},
       ${JSON.stringify(input.sources)}::jsonb, ${input.dataUnavailableNote ?? null},
       'manual_tiktok', ${actorEmail}, ${actorEmail})
  `;
  await recordAudit({
    actorEmail,
    action: "ar_opportunity_created",
    entityType: "ar_opportunity",
    entityId: id,
    after: { category: input.category, title: input.title, subjectName: input.subjectName },
  });
  const created = await getOpportunity(id);
  if (!created) throw new Error("No se pudo crear la oportunidad.");
  return created;
}

export async function updateOpportunity(id: string, patch: ArOpportunityUpdate, actorEmail: string): Promise<ArOpportunity | null> {
  await ensureArOpportunitiesSchema();
  const before = await getOpportunity(id);
  if (!before) return null;

  const status = patch.status ?? before.status;
  const category = patch.category ?? before.category;
  const suggestedSello = patch.suggestedSello !== undefined ? patch.suggestedSello : before.suggestedSello;

  await sql`
    UPDATE ar_opportunities
    SET status = ${status}, category = ${category}, suggested_sello = ${suggestedSello},
        updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
  `;
  await recordAudit({
    actorEmail,
    action: "ar_opportunity_updated",
    entityType: "ar_opportunity",
    entityId: id,
    before: { status: before.status, category: before.category, suggestedSello: before.suggestedSello },
    after: { status, category, suggestedSello },
  });
  return getOpportunity(id);
}

// Dedupe key for auto-generated opportunities — same spirit as
// findPlaylistByDriveDocId in the Playlists ingest: lets a re-run of a scan
// cheaply update the existing candidate instead of creating a duplicate.
// Only looks at non-archived, non-terminal rows — a subject that was
// DESCARTADO or ARCHIVADO on purpose should get a fresh row if it starts
// growing again later, not silently resurrect the old decision.
export async function findOpenOpportunityBySubject(subjectType: string, subjectKey: string): Promise<ArOpportunity | null> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`
    SELECT * FROM ar_opportunities
    WHERE subject_type = ${subjectType} AND subject_key = ${subjectKey}
      AND archived = false AND status NOT IN ('DESCARTADO', 'ARCHIVADO', 'INCORPORADO')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? rowToOpportunity(rows[0]) : null;
}

// Auto-generated candidates (source_type != manual) always land as NUEVO —
// scoring_version/score_breakdown/metrics/compatibility/sources are the
// only fields a re-scan is allowed to refresh; status/category/comments
// stay whatever a human already set on them.
export async function upsertAutoOpportunity(input: {
  category: ArOpportunity["category"];
  title: string;
  subjectType: ArOpportunity["subjectType"];
  subjectKey: string;
  subjectName: string;
  regionFocus: ArOpportunity["regionFocus"];
  sourceType: ArOpportunity["sourceType"];
  opportunityScore: number;
  scoringVersion: string;
  scoreBreakdown: ArScoreBreakdown;
  metrics: Record<string, unknown>;
  compatibility: ArCompatibility;
  suggestedSello: string | null;
  sources: ArSource[];
}): Promise<ArOpportunity> {
  await ensureArOpportunitiesSchema();
  const existing = await findOpenOpportunityBySubject(input.subjectType, input.subjectKey);
  if (existing) {
    await sql`
      UPDATE ar_opportunities
      SET opportunity_score = ${input.opportunityScore}, scoring_version = ${input.scoringVersion},
          score_breakdown = ${JSON.stringify(input.scoreBreakdown)}::jsonb, metrics = ${JSON.stringify(input.metrics)}::jsonb,
          compatibility = ${JSON.stringify(input.compatibility)}::jsonb, suggested_sello = ${input.suggestedSello},
          sources = ${JSON.stringify(input.sources)}::jsonb, updated_at = now()
      WHERE id = ${existing.id}
    `;
    const updated = await getOpportunity(existing.id);
    if (!updated) throw new Error("No se pudo actualizar la oportunidad.");
    return updated;
  }

  const id = newId();
  await sql`
    INSERT INTO ar_opportunities
      (id, category, title, status, subject_type, subject_key, subject_name, region_focus,
       suggested_sello, metrics, compatibility, sources, source_type,
       opportunity_score, scoring_version, score_breakdown)
    VALUES
      (${id}, ${input.category}, ${input.title}, 'NUEVO', ${input.subjectType}, ${input.subjectKey},
       ${input.subjectName}, ${input.regionFocus}, ${input.suggestedSello},
       ${JSON.stringify(input.metrics)}::jsonb, ${JSON.stringify(input.compatibility)}::jsonb,
       ${JSON.stringify(input.sources)}::jsonb, ${input.sourceType},
       ${input.opportunityScore}, ${input.scoringVersion}, ${JSON.stringify(input.scoreBreakdown)}::jsonb)
  `;
  const created = await getOpportunity(id);
  if (!created) throw new Error("No se pudo crear la oportunidad.");
  return created;
}

export async function listComments(opportunityId: string): Promise<ArOpportunityComment[]> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`
    SELECT * FROM ar_opportunity_comments WHERE opportunity_id = ${opportunityId} ORDER BY created_at ASC
  `;
  return rows.map(rowToComment);
}

export async function addComment(opportunityId: string, authorEmail: string, body: string): Promise<ArOpportunityComment> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`
    INSERT INTO ar_opportunity_comments (opportunity_id, author_email, body)
    VALUES (${opportunityId}, ${authorEmail}, ${body})
    RETURNING *
  `;
  return rowToComment(rows[0]);
}

// Minimal assignment write path — the full "Enviar a PM" UI lands in a
// later phase, but the table and this function exist from the start so
// listOpportunitiesFor()'s PM-scoping branch is verifiable now.
export async function assignToPm(opportunityId: string, pmEmail: string, comment: string | null, actorEmail: string): Promise<ArOpportunityAssignment> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`
    INSERT INTO ar_opportunity_assignments (opportunity_id, pm_email, assigned_by, comment)
    VALUES (${opportunityId}, ${pmEmail}, ${actorEmail}, ${comment})
    RETURNING *
  `;
  await sql`UPDATE ar_opportunities SET assigned_pm_email = ${pmEmail}, updated_by = ${actorEmail}, updated_at = now() WHERE id = ${opportunityId}`;
  await recordAudit({
    actorEmail,
    action: "ar_opportunity_assigned",
    entityType: "ar_opportunity",
    entityId: opportunityId,
    after: { pmEmail, comment },
  });
  return rowToAssignment(rows[0]);
}

export async function listAssignmentsForOpportunity(opportunityId: string): Promise<ArOpportunityAssignment[]> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`
    SELECT * FROM ar_opportunity_assignments WHERE opportunity_id = ${opportunityId} ORDER BY assigned_at DESC
  `;
  return rows.map(rowToAssignment);
}

export async function getAssignment(assignmentId: number): Promise<ArOpportunityAssignment | null> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`SELECT * FROM ar_opportunity_assignments WHERE id = ${assignmentId}`;
  return rows[0] ? rowToAssignment(rows[0]) : null;
}

export async function updateAssignmentStatus(assignmentId: number, taskStatus: ArTaskStatus): Promise<ArOpportunityAssignment | null> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`
    UPDATE ar_opportunity_assignments
    SET task_status = ${taskStatus},
        completed_at = CASE WHEN ${taskStatus} = 'done' THEN now() ELSE completed_at END
    WHERE id = ${assignmentId}
    RETURNING *
  `;
  return rows[0] ? rowToAssignment(rows[0]) : null;
}

// Writes Gemini-generated narrative content (never scores/metrics — those
// stay purely deterministic, see lib/arScoring.ts). Wholesale overwrite is
// intentional: "Generar/Regenerar" always replaces the previous narrative
// for this opportunity, there's no partial-merge concept here.
export async function setOpportunityNarrative(id: string, narrative: ArNarrative): Promise<ArOpportunity | null> {
  await ensureArOpportunitiesSchema();
  const { rows } = await sql`
    UPDATE ar_opportunities
    SET narrative = ${JSON.stringify(narrative)}::jsonb, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOpportunity(rows[0]) : null;
}

// Shared visibility check — admin/ar see every opportunity, anyone else
// (a PM) only sees ones assigned to them. Used by every route under
// app/api/ar/[id]/**, not just GET, so a PM can't read or write an
// opportunity nobody assigned to them.
export async function canSeeOpportunity(user: { email: string; roles: string[] }, opportunityId: string): Promise<boolean> {
  if (user.roles.includes("admin") || user.roles.includes("ar")) return true;
  const assignments = await listAssignmentsForOpportunity(opportunityId);
  return assignments.some((a) => a.pmEmail === user.email);
}
