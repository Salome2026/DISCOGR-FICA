import { sql } from "@vercel/postgres";
import { ensureLegalReleaseRequestsSchema } from "./legalReleaseRequests";
import { ensureEditorialSplitsSchema } from "./editorialSplits";
import { slugify } from "./artists";
import { upsertLaunchFromRelease } from "./cmLaunches";

// El lanzamiento llega a Community Manager igual con o sin links — solo
// cambia su materiales_estado (ver lib/pmTaskStatus.ts) — así que esto se
// llama siempre que se crea o edita un fonograma, nunca condicionado a que
// haya algún link cargado.
async function notifyCm(input: {
  pmReleaseId: number | null;
  pmReleaseGroupId: number | null;
  artistName: string;
  fonogramaNombre: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  horaLanzamiento: string | null;
  pmEmail: string;
  youtubeUrl: string | null;
  driveAssetsUrl: string | null;
  comentariosPm: string | null;
}) {
  try {
    await upsertLaunchFromRelease({ ...input, artistId: slugify(input.artistName) });
  } catch (err) {
    // Aditivo — un fallo acá nunca debe romper la carga real del fonograma.
    console.error("upsertLaunchFromRelease failed:", err);
  }
}

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
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS streaming_project TEXT`;
      await sql`ALTER TABLE pm_release_groups ADD COLUMN IF NOT EXISTS streaming_project TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS pm_releases_group_idx ON pm_releases (group_id)`;

      // Marketing plan lives per-track-row (like every other field a single
      // release has). For EP/álbum groups, the calendar treats all tracks in
      // a group as one event and reads/writes this through every row in the
      // group at once — see setMarketingPlan below.
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS marketing_plan BOOLEAN NOT NULL DEFAULT false`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS marketing_plan_detalle TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS pm_releases_fecha_idx ON pm_releases (fecha_lanzamiento)`;

      // Hora del lanzamiento, en formato "HH:MM" hora de Argentina (ART,
      // UTC-3). NULL significa "no seleccionada" — se interpreta como 00:00
      // en cada lugar donde se muestra.
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS hora_lanzamiento TEXT`;
      await sql`ALTER TABLE pm_release_groups ADD COLUMN IF NOT EXISTS hora_lanzamiento TEXT`;

      // Género musical del track — mismo GENEROS que ya usa Rizzvor a nivel
      // proyecto, acá a nivel de fila (single o canción de EP/álbum) para
      // habilitar sugerencias de playlists de Spotify por género.
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS genero TEXT`;

      // Tipo de obra (Cover/Remix/Tema de autoría propia, ver lib/tiposObra.ts)
      // determina si corresponde una tarea de Split editorial pendiente.
      // Nullable: filas viejas (pre-esta feature) se tratan como "No
      // corresponde" hasta que alguien las edite u override.
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS tipo_obra TEXT`;
      // Permite forzar una tarea de Split editorial incluso en un Cover/Remix.
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS split_override BOOLEAN NOT NULL DEFAULT false`;

      // Video de YouTube y carpeta de assets de Drive del lanzamiento — nivel
      // release, no por track. Mismo criterio que marketing_plan: para un
      // EP/álbum se escribe igual en cada fila del grupo (WHERE group_id=X en
      // setReleaseLinks), nunca en pm_release_groups, para no necesitar un
      // JOIN extra en ningún lugar que ya lee r.* (listReleasesForBoard,
      // etc.). Alimenta automáticamente el módulo Community Manager.
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS youtube_url TEXT`;
      await sql`ALTER TABLE pm_releases ADD COLUMN IF NOT EXISTS drive_assets_url TEXT`;

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
  streamingProject: string | null;
  fonograma: string;
  estado: EstadoRelease;
  distribuidora: string | null;
  fecha: string | null;
  hora: string | null;
  autoresCompositores: string | null;
  colaboradores: string | null;
  isrc: string | null;
  genero: string | null;
  tipoObra: string;
  audioUrl: string | null;
  portadaUrl: string | null;
  youtubeUrl: string | null;
  driveAssetsUrl: string | null;
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
      (artist_name, sello, streaming_project, fonograma_nombre, estado, distribuidora, fecha_lanzamiento,
       hora_lanzamiento, autores_compositores, colaboradores, isrc, genero, tipo_obra, audio_url, portada_url,
       youtube_url, drive_assets_url, created_by)
    VALUES
      (${r.artist}, ${r.sello}, ${r.streamingProject}, ${r.fonograma}, ${r.estado}, ${r.distribuidora}, ${r.fecha},
       ${r.hora}, ${r.autoresCompositores}, ${r.colaboradores}, ${r.isrc}, ${r.genero}, ${r.tipoObra}, ${r.audioUrl}, ${r.portadaUrl},
       ${r.youtubeUrl}, ${r.driveAssetsUrl}, ${r.createdBy})
    RETURNING *
  `;
  const release = rows[0];
  await sql`
    INSERT INTO pm_release_history (release_id, action, actor_email, detail)
    VALUES (${release.id}, 'created', ${r.createdBy}, ${`Estado inicial: ${r.estado}`})
  `;
  await notifyCm({
    pmReleaseId: release.id, pmReleaseGroupId: null, artistName: r.artist, fonogramaNombre: r.fonograma,
    sello: r.sello, fechaLanzamiento: r.fecha, horaLanzamiento: r.hora, pmEmail: r.createdBy,
    youtubeUrl: r.youtubeUrl, driveAssetsUrl: r.driveAssetsUrl, comentariosPm: null,
  });
  return release;
}

export type NewReleaseGroup = {
  tipo: Extract<TipoLanzamiento, "ep" | "album">;
  artist: string;
  sello: string | null;
  streamingProject: string | null;
  nombre: string;
  estado: EstadoRelease;
  distribuidora: string | null;
  fecha: string | null;
  hora: string | null;
  comentarios: string | null;
  youtubeUrl: string | null;
  driveAssetsUrl: string | null;
  createdBy: string;
};

export type NewGroupTrack = {
  trackNumber: number;
  fonograma: string;
  artist: string;
  colaboradores: string | null;
  productor: string | null;
  autoresCompositores: string | null;
  isrc: string | null;
  genero: string | null;
  tipoObra: string;
  audioUrl: string | null;
  portadaUrl: string | null;
  comentario: string | null;
};

export async function createGroupedRelease(group: NewReleaseGroup, tracks: NewGroupTrack[]) {
  await ensureReleasesSchema();
  const { rows: groupRows } = await sql`
    INSERT INTO pm_release_groups
      (tipo, artist_name, sello, streaming_project, nombre, estado, distribuidora, fecha_lanzamiento, hora_lanzamiento, comentarios, created_by)
    VALUES
      (${group.tipo}, ${group.artist}, ${group.sello}, ${group.streamingProject}, ${group.nombre}, ${group.estado},
       ${group.distribuidora}, ${group.fecha}, ${group.hora}, ${group.comentarios}, ${group.createdBy})
    RETURNING *
  `;
  const groupRow = groupRows[0];

  const trackRows = [];
  for (const t of tracks) {
    const { rows } = await sql`
      INSERT INTO pm_releases
        (artist_name, sello, streaming_project, fonograma_nombre, estado, distribuidora, fecha_lanzamiento, hora_lanzamiento,
         audio_url, portada_url, youtube_url, drive_assets_url, group_id, track_number, colaboradores, productor, autores_compositores, isrc, genero, tipo_obra, comentario, created_by)
      VALUES
        (${t.artist}, ${group.sello}, ${group.streamingProject}, ${t.fonograma}, ${group.estado}, ${group.distribuidora}, ${group.fecha}, ${group.hora},
         ${t.audioUrl}, ${t.portadaUrl}, ${group.youtubeUrl}, ${group.driveAssetsUrl}, ${groupRow.id}, ${t.trackNumber}, ${t.colaboradores},
         ${t.productor}, ${t.autoresCompositores}, ${t.isrc}, ${t.genero}, ${t.tipoObra}, ${t.comentario}, ${group.createdBy})
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

  await notifyCm({
    pmReleaseId: null, pmReleaseGroupId: groupRow.id, artistName: group.artist, fonogramaNombre: group.nombre,
    sello: group.sello, fechaLanzamiento: group.fecha, horaLanzamiento: group.hora, pmEmail: group.createdBy,
    youtubeUrl: group.youtubeUrl, driveAssetsUrl: group.driveAssetsUrl, comentariosPm: group.comentarios,
  });

  return { group: groupRow, tracks: trackRows };
}

export async function listAllReleases() {
  await ensureReleasesSchema();
  const { rows } = await sql`
    SELECT r.*, g.tipo AS group_tipo, g.nombre AS group_nombre
    FROM pm_releases r
    LEFT JOIN pm_release_groups g ON g.id = r.group_id
    WHERE r.archived = false
    ORDER BY r.created_at DESC
  `;
  return rows;
}

export async function listReleasesFor(email: string, roles: string[]) {
  await ensureReleasesSchema();
  // Legal and Editorial have no releases of their own — they need the same
  // full calendar as Label Management to know what's coming up, same live
  // data, same rule as admin's "see everything" branch below.
  if (["admin","legal","editorial","management"].some((r) => roles.includes(r))) {
    return listAllReleases();
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

// Per-artist feed for the PM artist-workspace calendar embed (Fase 2 of the
// PM↔Management assignment feature) — same row shape as listReleasesFor/
// listAllReleases, so it drops straight into <ReleaseCalendar>. Matches by
// name (case-insensitive), same join criterion the rest of the app already
// uses across modules (no FK from pm_releases to artists).
export async function listReleasesForArtist(artistName: string) {
  await ensureReleasesSchema();
  const { rows } = await sql`
    SELECT r.*, g.tipo AS group_tipo, g.nombre AS group_nombre
    FROM pm_releases r
    LEFT JOIN pm_release_groups g ON g.id = r.group_id
    WHERE r.archived = false AND r.artist_name ILIKE ${artistName}
    ORDER BY r.created_at DESC
  `;
  return rows;
}

// Separado de listReleasesFor() a propósito — esa función ya la consumen el
// calendario y otras pantallas tal cual está hoy; el board de tareas
// pendientes necesita columnas extra (de dos tablas más) que esas pantallas
// no piden, así que vive en su propia función en vez de arriesgar romper algo
// que ya funciona.
export async function listReleasesForBoard(email: string, roles: string[]) {
  await ensureReleasesSchema();
  await ensureLegalReleaseRequestsSchema();
  await ensureEditorialSplitsSchema();
  const roleFilter = ["admin","legal","editorial","management"].some((r) => roles.includes(r));
  // Las dos subconsultas de "sugerido" buscan un Release/Split cargado a
  // mano (suelto, sin ancla) para el mismo track+artista — así el board
  // puede ofrecer "vincular" en vez de que el PM tenga que recargar algo
  // que ya existe. Coinciden por nombre porque no hay otra clave posible
  // antes de que el fonograma exista.
  const { rows } = roleFilter
    ? await sql`
        SELECT r.*, g.tipo AS group_tipo, g.nombre AS group_nombre,
          lrr.id AS release_request_id, lrr.estado AS release_request_estado,
          es.id AS split_id, es.estado AS split_estado,
          (SELECT lrr2.id FROM legal_release_requests lrr2
             WHERE lrr2.pm_release_id IS NULL
               AND lower(lrr2.track_name) = lower(r.fonograma_nombre)
               AND lower(lrr2.artist_display) = lower(r.artist_name)
             ORDER BY lrr2.created_at ASC LIMIT 1) AS suggested_release_request_id,
          (SELECT es2.id FROM editorial_splits es2
             WHERE es2.catalog_track_id IS NULL
               AND lower(es2.track_name) = lower(r.fonograma_nombre)
               AND lower(es2.artist_display) = lower(r.artist_name)
             ORDER BY es2.created_at ASC LIMIT 1) AS suggested_split_id
        FROM pm_releases r
        LEFT JOIN pm_release_groups g ON g.id = r.group_id
        LEFT JOIN legal_release_requests lrr ON lrr.pm_release_id = r.id
        LEFT JOIN editorial_splits es ON es.catalog_track_id = 'pm-' || r.id
        WHERE r.archived = false
        ORDER BY r.created_at DESC
      `
    : await sql`
        SELECT r.*, g.tipo AS group_tipo, g.nombre AS group_nombre,
          lrr.id AS release_request_id, lrr.estado AS release_request_estado,
          es.id AS split_id, es.estado AS split_estado,
          (SELECT lrr2.id FROM legal_release_requests lrr2
             WHERE lrr2.pm_release_id IS NULL
               AND lower(lrr2.track_name) = lower(r.fonograma_nombre)
               AND lower(lrr2.artist_display) = lower(r.artist_name)
             ORDER BY lrr2.created_at ASC LIMIT 1) AS suggested_release_request_id,
          (SELECT es2.id FROM editorial_splits es2
             WHERE es2.catalog_track_id IS NULL
               AND lower(es2.track_name) = lower(r.fonograma_nombre)
               AND lower(es2.artist_display) = lower(r.artist_name)
             ORDER BY es2.created_at ASC LIMIT 1) AS suggested_split_id
        FROM pm_releases r
        LEFT JOIN pm_release_groups g ON g.id = r.group_id
        LEFT JOIN legal_release_requests lrr ON lrr.pm_release_id = r.id
        LEFT JOIN editorial_splits es ON es.catalog_track_id = 'pm-' || r.id
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

export async function setSplitOverride(id: number, value: boolean, actorEmail: string) {
  await ensureReleasesSchema();
  await sql`
    UPDATE pm_releases SET split_override = ${value}, updated_by = ${actorEmail}, updated_at = now()
    WHERE id = ${id}
  `;
  await sql`
    INSERT INTO pm_release_history (release_id, action, actor_email, detail)
    VALUES (${id}, 'updated', ${actorEmail}, ${`Split override -> ${value}`})
  `;
}

export async function setMarketingPlan(
  id: number,
  groupId: number | null,
  marketingPlan: boolean,
  detalle: string | null,
  actorEmail: string
) {
  await ensureReleasesSchema();
  if (groupId != null) {
    await sql`
      UPDATE pm_releases SET marketing_plan = ${marketingPlan}, marketing_plan_detalle = ${detalle},
        updated_by = ${actorEmail}, updated_at = now()
      WHERE group_id = ${groupId}
    `;
  } else {
    await sql`
      UPDATE pm_releases SET marketing_plan = ${marketingPlan}, marketing_plan_detalle = ${detalle},
        updated_by = ${actorEmail}, updated_at = now()
      WHERE id = ${id}
    `;
  }
  await sql`
    INSERT INTO pm_release_history (release_id, action, actor_email, detail)
    VALUES (${id}, 'updated', ${actorEmail}, ${`Plan de marketing -> ${marketingPlan ? "Sí" : "No"}`})
  `;
}

// Editable en cualquier momento después de creado el fonograma — es la
// única forma de agregar o corregir estos dos links post-carga. Mismo
// criterio group_id que setMarketingPlan(): un EP/álbum escribe el mismo
// valor en todas sus filas, nunca en pm_release_groups.
export async function setReleaseLinks(
  id: number,
  groupId: number | null,
  youtubeUrl: string | null,
  driveAssetsUrl: string | null,
  actorEmail: string
) {
  await ensureReleasesSchema();
  if (groupId != null) {
    await sql`
      UPDATE pm_releases SET youtube_url = ${youtubeUrl}, drive_assets_url = ${driveAssetsUrl},
        updated_by = ${actorEmail}, updated_at = now()
      WHERE group_id = ${groupId}
    `;
  } else {
    await sql`
      UPDATE pm_releases SET youtube_url = ${youtubeUrl}, drive_assets_url = ${driveAssetsUrl},
        updated_by = ${actorEmail}, updated_at = now()
      WHERE id = ${id}
    `;
  }
  const release = await getReleaseById(id);
  if (release) {
    await notifyCm({
      pmReleaseId: groupId != null ? null : id,
      pmReleaseGroupId: groupId,
      artistName: release.artist_name,
      fonogramaNombre: (groupId != null ? release.group_nombre : null) ?? release.fonograma_nombre,
      sello: release.sello,
      fechaLanzamiento: release.fecha_lanzamiento,
      horaLanzamiento: release.hora_lanzamiento,
      pmEmail: release.created_by,
      youtubeUrl,
      driveAssetsUrl,
      comentariosPm: null,
    });
  }
  await sql`
    INSERT INTO pm_release_history (release_id, action, actor_email, detail)
    VALUES (${id}, 'updated', ${actorEmail}, 'Links de YouTube/assets actualizados')
  `;
}

export async function getReleaseById(id: number) {
  await ensureReleasesSchema();
  const { rows } = await sql`
    SELECT r.*, g.tipo AS group_tipo, g.nombre AS group_nombre
    FROM pm_releases r
    LEFT JOIN pm_release_groups g ON g.id = r.group_id
    WHERE r.id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getReleaseOwner(id: number) {
  await ensureReleasesSchema();
  const { rows } = await sql`SELECT created_by, group_id FROM pm_releases WHERE id = ${id}`;
  return (rows[0] as { created_by: string; group_id: number | null } | undefined) ?? null;
}

export async function archiveRelease(id: number, groupId: number | null, actorEmail: string) {
  await ensureReleasesSchema();
  if (groupId != null) {
    await sql`UPDATE pm_releases SET archived = true WHERE group_id = ${groupId}`;
  } else {
    await sql`UPDATE pm_releases SET archived = true WHERE id = ${id}`;
  }
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

