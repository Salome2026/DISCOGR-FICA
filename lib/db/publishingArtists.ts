import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensurePublishingArtistsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS publishing_artists (
          id TEXT PRIMARY KEY,
          nombre_artistico TEXT NOT NULL,
          nombre_completo TEXT,
          apellido TEXT,
          dni TEXT,
          sadaic TEXT,
          direccion TEXT,
          nacionalidad TEXT,
          fecha_nacimiento TEXT,
          email TEXT,
          telefono TEXT,
          sello TEXT,
          tipo TEXT NOT NULL DEFAULT 'Propio',
          observaciones TEXT,
          documento_url TEXT,
          documento_nombre TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS publishing_artists_nombre_idx ON publishing_artists (nombre_artistico)`;
      // CUIL (identificador fiscal, distinto del DNI) y localidad/provincia
      // como campos propios en vez de mezclados dentro de direccion — la
      // planilla de carga masiva del sello los trae ya separados.
      await sql`ALTER TABLE publishing_artists ADD COLUMN IF NOT EXISTS cuil TEXT`;
      await sql`ALTER TABLE publishing_artists ADD COLUMN IF NOT EXISTS localidad TEXT`;
      await sql`ALTER TABLE publishing_artists ADD COLUMN IF NOT EXISTS provincia TEXT`;
    })();
  }
  return ready;
}

export const TIPOS_ARTISTA_PUBLISHING = ["Propio", "Externo"] as const;

export type PublishingArtist = {
  id: string;
  nombreArtistico: string;
  nombreCompleto: string | null;
  apellido: string | null;
  dni: string | null;
  cuil: string | null;
  sadaic: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  nacionalidad: string | null;
  fechaNacimiento: string | null;
  email: string | null;
  telefono: string | null;
  sello: string | null;
  tipo: string;
  observaciones: string | null;
  documentoUrl: string | null;
  documentoNombre: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToArtist(r: Record<string, unknown>): PublishingArtist {
  return {
    id: r.id as string,
    nombreArtistico: r.nombre_artistico as string,
    nombreCompleto: (r.nombre_completo as string | null) ?? null,
    apellido: (r.apellido as string | null) ?? null,
    dni: (r.dni as string | null) ?? null,
    cuil: (r.cuil as string | null) ?? null,
    sadaic: (r.sadaic as string | null) ?? null,
    direccion: (r.direccion as string | null) ?? null,
    localidad: (r.localidad as string | null) ?? null,
    provincia: (r.provincia as string | null) ?? null,
    nacionalidad: (r.nacionalidad as string | null) ?? null,
    fechaNacimiento: (r.fecha_nacimiento as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    telefono: (r.telefono as string | null) ?? null,
    sello: (r.sello as string | null) ?? null,
    tipo: r.tipo as string,
    observaciones: (r.observaciones as string | null) ?? null,
    documentoUrl: (r.documento_url as string | null) ?? null,
    documentoNombre: (r.documento_nombre as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listPublishingArtists(): Promise<PublishingArtist[]> {
  await ensurePublishingArtistsSchema();
  const { rows } = await sql`SELECT * FROM publishing_artists ORDER BY nombre_artistico ASC`;
  return rows.map(rowToArtist);
}

export async function searchPublishingArtists(q: string, limit = 20): Promise<PublishingArtist[]> {
  await ensurePublishingArtistsSchema();
  const query = q.trim();
  if (!query) return [];
  const { rows } = await sql`
    SELECT * FROM publishing_artists
    WHERE nombre_artistico ILIKE ${"%" + query + "%"}
    ORDER BY nombre_artistico ASC
    LIMIT ${limit}
  `;
  return rows.map(rowToArtist);
}

export async function getPublishingArtist(id: string): Promise<PublishingArtist | null> {
  await ensurePublishingArtistsSchema();
  const { rows } = await sql`SELECT * FROM publishing_artists WHERE id = ${id}`;
  return rows[0] ? rowToArtist(rows[0]) : null;
}

type ArtistInput = {
  nombreArtistico: string;
  nombreCompleto: string | null;
  apellido: string | null;
  dni: string | null;
  cuil: string | null;
  sadaic: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  nacionalidad: string | null;
  fechaNacimiento: string | null;
  email: string | null;
  telefono: string | null;
  sello: string | null;
  tipo: string;
  observaciones: string | null;
  documentoUrl: string | null;
  documentoNombre: string | null;
  actorEmail: string;
};

export async function createPublishingArtist(input: ArtistInput): Promise<PublishingArtist> {
  await ensurePublishingArtistsSchema();
  const id = `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO publishing_artists
      (id, nombre_artistico, nombre_completo, apellido, dni, cuil, sadaic, direccion, localidad, provincia,
       nacionalidad, fecha_nacimiento, email, telefono, sello, tipo, observaciones, documento_url, documento_nombre,
       updated_by, updated_at)
    VALUES
      (${id}, ${input.nombreArtistico}, ${input.nombreCompleto}, ${input.apellido}, ${input.dni}, ${input.cuil}, ${input.sadaic},
       ${input.direccion}, ${input.localidad}, ${input.provincia}, ${input.nacionalidad}, ${input.fechaNacimiento},
       ${input.email}, ${input.telefono}, ${input.sello}, ${input.tipo}, ${input.observaciones}, ${input.documentoUrl},
       ${input.documentoNombre}, ${input.actorEmail}, now())
    RETURNING *
  `;
  return rowToArtist(rows[0]);
}

export async function updatePublishingArtist(id: string, input: ArtistInput): Promise<PublishingArtist | null> {
  await ensurePublishingArtistsSchema();
  const { rows } = await sql`
    UPDATE publishing_artists SET
      nombre_artistico = ${input.nombreArtistico},
      nombre_completo = ${input.nombreCompleto},
      apellido = ${input.apellido},
      dni = ${input.dni},
      cuil = ${input.cuil},
      sadaic = ${input.sadaic},
      direccion = ${input.direccion},
      localidad = ${input.localidad},
      provincia = ${input.provincia},
      nacionalidad = ${input.nacionalidad},
      fecha_nacimiento = ${input.fechaNacimiento},
      email = ${input.email},
      telefono = ${input.telefono},
      sello = ${input.sello},
      tipo = ${input.tipo},
      observaciones = ${input.observaciones},
      documento_url = ${input.documentoUrl},
      documento_nombre = ${input.documentoNombre},
      updated_by = ${input.actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToArtist(rows[0]) : null;
}
