import { sql } from "@vercel/postgres";
import { recordAudit } from "@/lib/db/users";
import { materialesEstado, type MaterialesEstado } from "@/lib/pmTaskStatus";
import { listAccountsBySelloOrArtist, getAccountAssignment, listCollaboratorsForAccount } from "@/lib/db/cmAccounts";

let ready: Promise<void> | null = null;

export function ensureCmLaunchesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS cm_launches (
          id TEXT PRIMARY KEY,
          pm_release_id BIGINT,
          pm_release_group_id BIGINT,
          artist_id TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          fonograma_nombre TEXT NOT NULL,
          sello TEXT,
          fecha_lanzamiento DATE,
          hora_lanzamiento TEXT,
          pm_email TEXT NOT NULL,
          youtube_url TEXT,
          drive_assets_url TEXT,
          comentarios_pm TEXT,
          revisado_por_cm BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS cm_launches_release_idx ON cm_launches (pm_release_id) WHERE pm_release_id IS NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS cm_launches_group_idx ON cm_launches (pm_release_group_id) WHERE pm_release_group_id IS NOT NULL`;

      // Hilo visible a la vez para el PM y la(s) CM del lanzamiento — mismo
      // shape append-only que rizzvor_project_comments/ar_opportunity_comments.
      await sql`
        CREATE TABLE IF NOT EXISTS cm_launch_comments (
          id BIGSERIAL PRIMARY KEY,
          launch_id TEXT NOT NULL REFERENCES cm_launches(id) ON DELETE CASCADE,
          author_email TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  return ready;
}

export type CmLaunch = {
  id: string;
  pmReleaseId: number | null;
  pmReleaseGroupId: number | null;
  artistId: string;
  artistName: string;
  fonogramaNombre: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  horaLanzamiento: string | null;
  pmEmail: string;
  youtubeUrl: string | null;
  driveAssetsUrl: string | null;
  comentariosPm: string | null;
  revisadoPorCm: boolean;
  materialesEstado: MaterialesEstado;
  createdAt: string;
  updatedAt: string;
};

function rowToLaunch(r: Record<string, unknown>): CmLaunch {
  const youtubeUrl = (r.youtube_url as string) ?? null;
  const driveAssetsUrl = (r.drive_assets_url as string) ?? null;
  return {
    id: r.id as string,
    pmReleaseId: r.pm_release_id != null ? Number(r.pm_release_id) : null,
    pmReleaseGroupId: r.pm_release_group_id != null ? Number(r.pm_release_group_id) : null,
    artistId: r.artist_id as string,
    artistName: r.artist_name as string,
    fonogramaNombre: r.fonograma_nombre as string,
    sello: (r.sello as string) ?? null,
    fechaLanzamiento: (r.fecha_lanzamiento as string) ?? null,
    horaLanzamiento: (r.hora_lanzamiento as string) ?? null,
    pmEmail: r.pm_email as string,
    youtubeUrl,
    driveAssetsUrl,
    comentariosPm: (r.comentarios_pm as string) ?? null,
    revisadoPorCm: r.revisado_por_cm as boolean,
    materialesEstado: materialesEstado(youtubeUrl, driveAssetsUrl),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function launchId(pmReleaseId: number | null, pmReleaseGroupId: number | null): string {
  return pmReleaseGroupId != null ? `cml-group-${pmReleaseGroupId}` : `cml-release-${pmReleaseId}`;
}

// Llamado desde lib/db/releases.ts al crear o editar los links de un
// fonograma — INSERT...ON CONFLICT por el índice único de arriba, así que
// nunca crea un segundo lanzamiento ni duplica la tarea, sea cual sea el
// número de veces que el PM edite los links después.
export async function upsertLaunchFromRelease(input: {
  pmReleaseId: number | null;
  pmReleaseGroupId: number | null;
  artistId: string;
  artistName: string;
  fonogramaNombre: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  horaLanzamiento: string | null;
  pmEmail: string;
  youtubeUrl: string | null;
  driveAssetsUrl: string | null;
  comentariosPm: string | null;
}): Promise<void> {
  await ensureCmLaunchesSchema();
  const id = launchId(input.pmReleaseId, input.pmReleaseGroupId);
  if (input.pmReleaseGroupId != null) {
    await sql`
      INSERT INTO cm_launches (id, pm_release_id, pm_release_group_id, artist_id, artist_name, fonograma_nombre, sello, fecha_lanzamiento, hora_lanzamiento, pm_email, youtube_url, drive_assets_url, comentarios_pm, updated_at)
      VALUES (${id}, ${input.pmReleaseId}, ${input.pmReleaseGroupId}, ${input.artistId}, ${input.artistName}, ${input.fonogramaNombre}, ${input.sello}, ${input.fechaLanzamiento}, ${input.horaLanzamiento}, ${input.pmEmail}, ${input.youtubeUrl}, ${input.driveAssetsUrl}, ${input.comentariosPm}, now())
      ON CONFLICT (pm_release_group_id) WHERE pm_release_group_id IS NOT NULL DO UPDATE SET
        artist_id = EXCLUDED.artist_id, artist_name = EXCLUDED.artist_name, fonograma_nombre = EXCLUDED.fonograma_nombre, sello = EXCLUDED.sello,
        fecha_lanzamiento = EXCLUDED.fecha_lanzamiento, hora_lanzamiento = EXCLUDED.hora_lanzamiento,
        youtube_url = EXCLUDED.youtube_url, drive_assets_url = EXCLUDED.drive_assets_url, comentarios_pm = EXCLUDED.comentarios_pm,
        updated_at = now()
    `;
  } else {
    await sql`
      INSERT INTO cm_launches (id, pm_release_id, pm_release_group_id, artist_id, artist_name, fonograma_nombre, sello, fecha_lanzamiento, hora_lanzamiento, pm_email, youtube_url, drive_assets_url, comentarios_pm, updated_at)
      VALUES (${id}, ${input.pmReleaseId}, ${input.pmReleaseGroupId}, ${input.artistId}, ${input.artistName}, ${input.fonogramaNombre}, ${input.sello}, ${input.fechaLanzamiento}, ${input.horaLanzamiento}, ${input.pmEmail}, ${input.youtubeUrl}, ${input.driveAssetsUrl}, ${input.comentariosPm}, now())
      ON CONFLICT (pm_release_id) WHERE pm_release_id IS NOT NULL DO UPDATE SET
        artist_id = EXCLUDED.artist_id, artist_name = EXCLUDED.artist_name, fonograma_nombre = EXCLUDED.fonograma_nombre, sello = EXCLUDED.sello,
        fecha_lanzamiento = EXCLUDED.fecha_lanzamiento, hora_lanzamiento = EXCLUDED.hora_lanzamiento,
        youtube_url = EXCLUDED.youtube_url, drive_assets_url = EXCLUDED.drive_assets_url, comentarios_pm = EXCLUDED.comentarios_pm,
        updated_at = now()
    `;
  }
}

export async function getLaunch(id: string): Promise<CmLaunch | null> {
  await ensureCmLaunchesSchema();
  const { rows } = await sql`SELECT * FROM cm_launches WHERE id = ${id}`;
  return rows[0] ? rowToLaunch(rows[0]) : null;
}

// Bandeja de una CM: lanzamientos de los sellos/artistas de sus cuentas
// asignadas (dueña o colaboradora).
export async function listLaunchesForCm(cmEmail: string): Promise<CmLaunch[]> {
  await ensureCmLaunchesSchema();
  const { rows } = await sql`
    SELECT DISTINCT l.* FROM cm_launches l
    WHERE EXISTS (
      SELECT 1 FROM cm_accounts a
      LEFT JOIN cm_account_assignments own ON own.account_id = a.id
      LEFT JOIN cm_account_collaborators collab ON collab.account_id = a.id
      WHERE (own.cm_email = ${cmEmail} OR collab.cm_email = ${cmEmail})
        AND ((a.sello IS NOT NULL AND a.sello = l.sello) OR (a.linked_artist_id IS NOT NULL AND a.linked_artist_id = l.artist_id))
    )
    ORDER BY l.fecha_lanzamiento DESC NULLS LAST, l.created_at DESC
  `;
  return rows.map(rowToLaunch);
}

// Bandeja de Management: lanzamientos cuyo sello/artista no tiene ninguna
// cuenta de CM asignada todavía.
export async function listLaunchesWithoutCm(): Promise<CmLaunch[]> {
  await ensureCmLaunchesSchema();
  const { rows } = await sql`
    SELECT l.* FROM cm_launches l
    WHERE NOT EXISTS (
      SELECT 1 FROM cm_accounts a
      WHERE a.active = true
        AND ((a.sello IS NOT NULL AND a.sello = l.sello) OR (a.linked_artist_id IS NOT NULL AND a.linked_artist_id = l.artist_id))
    )
    ORDER BY l.fecha_lanzamiento DESC NULLS LAST, l.created_at DESC
  `;
  return rows.map(rowToLaunch);
}

// Lanzamientos a cargo de un PM (para que vea los comentarios/pedidos de
// materiales de la CM dentro de su propio panel).
export async function listLaunchesForPm(pmEmail: string): Promise<CmLaunch[]> {
  await ensureCmLaunchesSchema();
  const { rows } = await sql`SELECT * FROM cm_launches WHERE pm_email = ${pmEmail} ORDER BY fecha_lanzamiento DESC NULLS LAST, created_at DESC`;
  return rows.map(rowToLaunch);
}

export async function markLaunchReviewed(id: string, actorEmail: string): Promise<void> {
  await ensureCmLaunchesSchema();
  await sql`UPDATE cm_launches SET revisado_por_cm = true, updated_at = now() WHERE id = ${id}`;
  await recordAudit({ actorEmail, action: "cm_launch_reviewed", entityType: "cm_launch", entityId: id });
}

export async function addLaunchComment(launchId: string, authorEmail: string, body: string): Promise<void> {
  await ensureCmLaunchesSchema();
  await sql`INSERT INTO cm_launch_comments (launch_id, author_email, body) VALUES (${launchId}, ${authorEmail}, ${body})`;
}

export async function listLaunchComments(launchId: string) {
  await ensureCmLaunchesSchema();
  const { rows } = await sql`SELECT * FROM cm_launch_comments WHERE launch_id = ${launchId} ORDER BY created_at ASC`;
  return rows;
}

// Reexportado para que las rutas de asignación de Management no tengan que
// importar de dos módulos distintos al resolver "¿a qué cuentas les toca
// este lanzamiento?".
export { listAccountsBySelloOrArtist, getAccountAssignment, listCollaboratorsForAccount };
