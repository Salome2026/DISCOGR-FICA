import { sql } from "@vercel/postgres";

export type EstadoRelease = "Contactado" | "Firmado" | "Necesito ayuda";

let ready: Promise<void> | null = null;

export function ensureReleasesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS pm_releases (
          id BIGSERIAL PRIMARY KEY,
          artist_name TEXT NOT NULL,
          sello TEXT,
          fonograma_nombre TEXT NOT NULL,
          estado TEXT NOT NULL,
          distribuidora TEXT,
          fecha_lanzamiento DATE,
          autores_compositores TEXT,
          audio_url TEXT,
          portada_url TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ,
          archived BOOLEAN NOT NULL DEFAULT false
        )
      `;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS autores_compositores TEXT`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS audio_url TEXT`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS portada_url TEXT`;
      await sql`
        CREATE TABLE IF NOT EXISTS pm_release_history (
          id BIGSERIAL PRIMARY KEY,
          release_id BIGINT NOT NULL REFERENCES pm_releases(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          actor_email TEXT NOT NULL,
          at TIMESTAMPTZ NOT NULL DEFAULT now(),
          detail TEXT
        )
      `;
    })();
  }
  return ready;
}

export type NewRelease = {
  artist: string;
  sello: string | null;
  fonograma: string;
  estado: EstadoRelease;
  distribuidora: string | null;
  fecha: string | null;
  autoresCompositores: string | null;
  audioUrl: string | null;
  portadaUrl: string | null;
  createdBy: string;
};

export async function findDuplicateRelease(artist: string, fonograma: string, fecha: string | null) {
  await ensureReleasesSchema();
  const { rows } = await sql`
    SELECT id FROM pm_releases
    WHERE archived = false
      AND lower(artist_name) = lower(${artist})
      AND lower(fonograma_nombre) = lower(${fonograma})
      AND (fecha_lanzamiento = ${fecha}::date OR (fecha_lanzamiento IS NULL AND ${fecha}::date IS NULL))
  `;
  return rows[0] ?? null;
}

export async function createRelease(r: NewRelease) {
  await ensureReleasesSchema();
  const { rows } = await sql`
    INSERT INTO pm_releases
      (artist_name, sello, fonograma_nombre, estado, distribuidora, fecha_lanzamiento,
       autores_compositores, audio_url, portada_url, created_by)
    VALUES
      (${r.artist}, ${r.sello}, ${r.fonograma}, ${r.estado}, ${r.distribuidora}, ${r.fecha},
       ${r.autoresCompositores}, ${r.audioUrl}, ${r.portadaUrl}, ${r.createdBy})
    RETURNING *
  `;
  const release = rows[0];
  await sql`
    INSERT INTO pm_release_history (release_id, action, actor_email, detail)
    VALUES (${release.id}, 'created', ${r.createdBy}, ${`Estado inicial: ${r.estado}`})
  `;
  return release;
}

export async function listReleasesFor(email: string, role: string) {
  await ensureReleasesSchema();
  if (role === "admin") {
    const { rows } = await sql`
      SELECT * FROM pm_releases WHERE archived = false ORDER BY created_at DESC
    `;
    return rows;
  }
  const { rows } = await sql`
    SELECT * FROM pm_releases
    WHERE archived = false AND created_by = ${email}
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function updateReleaseEstado(
  id: number,
  estado: EstadoRelease,
  actorEmail: string
) {
  await ensureReleasesSchema();
  await sql`
    UPDATE pm_releases SET estado = ${estado}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
  `;
  await sql`
    INSERT INTO pm_release_history (release_id, action, actor_email, detail)
    VALUES (${id}, 'updated', ${actorEmail}, ${`Estado -> ${estado}`})
  `;
}

export async function archiveRelease(id: number, actorEmail: string) {
  await ensureReleasesSchema();
  await sql`UPDATE pm_releases SET archived = true WHERE id = ${id}`;
  await sql`
    INSERT INTO pm_release_history (release_id, action, actor_email, detail)
    VALUES (${id}, 'archived', ${actorEmail}, NULL)
  `;
}

export async function getReleaseHistory(id: number) {
  await ensureReleasesSchema();
  const { rows } = await sql`
    SELECT * FROM pm_release_history WHERE release_id = ${id} ORDER BY at ASC
  `;
  return rows;
}
