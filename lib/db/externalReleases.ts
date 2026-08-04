import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensureExternalReleasesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS legal_external_releases (
          id TEXT PRIMARY KEY,
          artist TEXT NOT NULL,
          titulo TEXT NOT NULL,
          sello_externo TEXT,
          fecha_lanzamiento TEXT,
          vinculo TEXT,
          documento_url TEXT,
          documento_nombre TEXT,
          notas TEXT,
          requiere_revision BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS legal_external_releases_artist_idx ON legal_external_releases (artist)`;
    })();
  }
  return ready;
}

export type ExternalRelease = {
  id: string;
  artist: string;
  titulo: string;
  selloExterno: string | null;
  fechaLanzamiento: string | null;
  vinculo: string | null;
  documentoUrl: string | null;
  documentoNombre: string | null;
  notas: string | null;
  requiereRevision: boolean;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToRelease(r: Record<string, unknown>): ExternalRelease {
  return {
    id: r.id as string,
    artist: r.artist as string,
    titulo: r.titulo as string,
    selloExterno: (r.sello_externo as string | null) ?? null,
    fechaLanzamiento: (r.fecha_lanzamiento as string | null) ?? null,
    vinculo: (r.vinculo as string | null) ?? null,
    documentoUrl: (r.documento_url as string | null) ?? null,
    documentoNombre: (r.documento_nombre as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    requiereRevision: !!r.requiere_revision,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listExternalReleases(): Promise<ExternalRelease[]> {
  await ensureExternalReleasesSchema();
  const { rows } = await sql`
    SELECT * FROM legal_external_releases ORDER BY artist ASC, fecha_lanzamiento DESC NULLS LAST
  `;
  return rows.map(rowToRelease);
}

type ExternalReleaseInput = {
  artist: string;
  titulo: string;
  selloExterno: string | null;
  fechaLanzamiento: string | null;
  vinculo: string | null;
  documentoUrl: string | null;
  documentoNombre: string | null;
  notas: string | null;
  requiereRevision: boolean;
  actorEmail: string;
};

export async function createExternalRelease(input: ExternalReleaseInput): Promise<ExternalRelease> {
  await ensureExternalReleasesSchema();
  const id = `extrel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO legal_external_releases
      (id, artist, titulo, sello_externo, fecha_lanzamiento, vinculo, documento_url, documento_nombre, notas, requiere_revision, updated_by, updated_at)
    VALUES
      (${id}, ${input.artist}, ${input.titulo}, ${input.selloExterno}, ${input.fechaLanzamiento}, ${input.vinculo},
       ${input.documentoUrl}, ${input.documentoNombre}, ${input.notas}, ${input.requiereRevision}, ${input.actorEmail}, now())
    RETURNING *
  `;
  return rowToRelease(rows[0]);
}

export async function updateExternalRelease(id: string, input: ExternalReleaseInput): Promise<ExternalRelease | null> {
  await ensureExternalReleasesSchema();
  const { rows } = await sql`
    UPDATE legal_external_releases SET
      artist = ${input.artist},
      titulo = ${input.titulo},
      sello_externo = ${input.selloExterno},
      fecha_lanzamiento = ${input.fechaLanzamiento},
      vinculo = ${input.vinculo},
      documento_url = ${input.documentoUrl},
      documento_nombre = ${input.documentoNombre},
      notas = ${input.notas},
      requiere_revision = ${input.requiereRevision},
      updated_by = ${input.actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToRelease(rows[0]) : null;
}
