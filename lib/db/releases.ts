import { sql } from "@vercel/postgres";

export type EstadoRelease = "Contactado" | "Firmado" | "Necesito ayuda";
export type TipoLanzamiento = "single" | "ep" | "album";

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

      // EP/álbum support: a release group holds the shared fields (sello,
      // estado, distribuidora, fecha, nombre del EP/álbum); each pm_releases
      // row is one canción, linked via group_id. Singles never get a group —
      // group_id stays NULL for them, exactly like every row before this.
      await sql`
        CREATE TABLE IF NOT EXISTS pm_release_groups (
          id BIGSERIAL PRIMARY KEY,
          tipo TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          sello TEXT,
          nombre TEXT,
          estado TEXT NOT NULL,
          distribuidora TEXT,
          fecha_lanzamiento DATE,
          comentarios TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES pm_release_groups(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS track_number INTEGER`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS colaboradores TEXT`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS productor TEXT`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS isrc TEXT`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS comentario TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS pm_releases_group_idx ON pm_releases (group_id)`;

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

export type NewReleaseGroup = {
  tipo: Extract<TipoLanzamiento, "ep" | "album">;
  artist: string;
  sello: string | null;
  nombre: string;
  estado: EstadoRelease;
  distribuidora: string | null;
  fecha: string | null;
  comentarios: string | null;
  createdBy: string;
};

export type NewGroupTrack = {
  trackNumber: number;
  fonograma: string;
  artist: string;
  colaboradores: string | null;
  productor: string | null;
  isrc: string | null;
  audioUrl: string | null;
  portadaUrl: string | null;
  comentario: string | null;
};

export async function createGroupedRelease(group: NewReleaseGroup, tracks: NewGroupTrack[]) {
  await ensureReleasesSchema();
  const { rows: groupRows } = await sql`
    INSERT INTO pm_release_groups
      (tipo, artist_name, sello, nombre, estado, distribuidora, fecha_lanzamiento, comentarios, created_by)
    VALUES
      (${group.tipo}, ${group.artist}, ${group.sello}, ${group.nombre}, ${group.estado},
       ${group.distribuidora}, ${group.fecha}, ${group.comentarios}, ${group.createdBy})
    RETURNING *
  `;
  const groupRow = groupRows[0];

  const trackRows = [];
  for (const t of tracks) {
    const { rows } = await sql`
      INSERT INTO pm_releases
        (artist_name, sello, fonograma_nombre, estado, distribuidora, fecha_lanzamiento,
         audio_url, portada_url, group_id, track_number, colaboradores, productor, isrc, comentario, created_by)
      VALUES
        (${t.artist}, ${group.sello}, ${t.fonograma}, ${group.estado}, ${group.distribuidora}, ${group.fecha},
         ${t.audioUrl}, ${t.portadaUrl}, ${groupRow.id}, ${t.trackNumber}, ${t.colaboradores},
         ${t.productor}, ${t.isrc}, ${t.comentario}, ${group.createdBy})
      RETURNING *
    `;
    const track = rows[0];
    trackRows.push(track);
    await sql`
      INSERT INTO pm_release_history (release_id, action, actor_email, detail)
      VALUES (${track.id}, 'created', ${group.createdBy},
        ${`Canción #${t.trackNumber} de ${group.tipo === "ep" ? "EP" : "álbum"} "${group.nombre}"`})
    `;
  }

  return { group: groupRow, tracks: trackRows };
}

export async function listReleasesFor(email: string, role: string) {
  await ensureReleasesSchema();
  if (role === "admin") {
    const { rows } = await sql`
      SELECT r.*, g.tipo AS group_tipo, g.nombre AS group_nombre
      FROM pm_releases r
      LEFT JOIN pm_release_groups g ON g.id = r.group_id
      WHERE r.archived = false
      ORDER BY r.created_at DESC
    `;
    return rows;
  }
  const { rows } = await sql`
    SELECT r.*, g.tipo AS group_tipo, g.nombre AS group_nombre
    FROM pm_releases r
    LEFT JOIN pm_release_groups g ON g.id = r.group_id
    WHERE r.archived = false AND r.created_by = ${email}
    ORDER BY r.created_at DESC
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
