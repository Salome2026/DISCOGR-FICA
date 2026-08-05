import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

// Legales -> Releases Fonogramas -> Artista -> Canción (+featuring) -> documento
// firmado. Deliberately its own table, not a legal_contracts row: a signed
// release is tied to one specific fonograma + its featuring, not a general
// per-artist Editorial/Intérprete/Representación category, and it never goes
// through Notion — the Legal module needs to be able to show "releases
// firmados" on its own, without depending on an external system.
export function ensureLegalSignedReleasesSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS legal_signed_releases (
          id TEXT PRIMARY KEY,
          artist TEXT NOT NULL,
          sello TEXT,
          fonograma TEXT NOT NULL,
          featuring TEXT,
          fecha_firma TEXT,
          documento_url TEXT,
          documento_nombre TEXT,
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS legal_signed_releases_artist_idx ON legal_signed_releases (artist)`;
    })();
  }
  return ready;
}

export type SignedRelease = {
  id: string;
  artist: string;
  sello: string | null;
  fonograma: string;
  featuring: string | null;
  fechaFirma: string | null;
  documentoUrl: string | null;
  documentoNombre: string | null;
  notas: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToRelease(r: Record<string, unknown>): SignedRelease {
  return {
    id: r.id as string,
    artist: r.artist as string,
    sello: (r.sello as string | null) ?? null,
    fonograma: r.fonograma as string,
    featuring: (r.featuring as string | null) ?? null,
    fechaFirma: (r.fecha_firma as string | null) ?? null,
    documentoUrl: (r.documento_url as string | null) ?? null,
    documentoNombre: (r.documento_nombre as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listSignedReleases(): Promise<SignedRelease[]> {
  await ensureLegalSignedReleasesSchema();
  const { rows } = await sql`SELECT * FROM legal_signed_releases ORDER BY artist ASC, fecha_firma DESC NULLS LAST`;
  return rows.map(rowToRelease);
}

export async function getSignedRelease(id: string): Promise<SignedRelease | null> {
  await ensureLegalSignedReleasesSchema();
  const { rows } = await sql`SELECT * FROM legal_signed_releases WHERE id = ${id}`;
  return rows[0] ? rowToRelease(rows[0]) : null;
}

type ReleaseInput = {
  artist: string;
  sello: string | null;
  fonograma: string;
  featuring: string | null;
  fechaFirma: string | null;
  documentoUrl: string | null;
  documentoNombre: string | null;
  notas: string | null;
  actorEmail: string;
};

export async function createSignedRelease(input: ReleaseInput): Promise<SignedRelease> {
  await ensureLegalSignedReleasesSchema();
  const id = `sr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO legal_signed_releases
      (id, artist, sello, fonograma, featuring, fecha_firma, documento_url, documento_nombre, notas, updated_by, updated_at)
    VALUES
      (${id}, ${input.artist}, ${input.sello}, ${input.fonograma}, ${input.featuring}, ${input.fechaFirma},
       ${input.documentoUrl}, ${input.documentoNombre}, ${input.notas}, ${input.actorEmail}, now())
    RETURNING *
  `;
  return rowToRelease(rows[0]);
}

export async function updateSignedRelease(id: string, input: ReleaseInput): Promise<SignedRelease | null> {
  await ensureLegalSignedReleasesSchema();
  const { rows } = await sql`
    UPDATE legal_signed_releases SET
      artist = ${input.artist},
      sello = ${input.sello},
      fonograma = ${input.fonograma},
      featuring = ${input.featuring},
      fecha_firma = ${input.fechaFirma},
      documento_url = ${input.documentoUrl},
      documento_nombre = ${input.documentoNombre},
      notas = ${input.notas},
      updated_by = ${input.actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToRelease(rows[0]) : null;
}
