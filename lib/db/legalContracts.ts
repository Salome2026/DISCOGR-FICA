import { sql } from "@vercel/postgres";

let ready: Promise<void> | null = null;

export function ensureLegalSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS legal_contracts (
          id TEXT PRIMARY KEY,
          artist TEXT NOT NULL,
          sello TEXT,
          tipo_contrato TEXT NOT NULL,
          fecha_firma TEXT,
          fecha_vencimiento TEXT,
          estado TEXT NOT NULL DEFAULT 'Vigente',
          documento_url TEXT,
          documento_nombre TEXT,
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
      // Both found to be real, already-in-use fields when reviewing the
      // actual Legal Drive: contracts aren't always with the sello itself
      // (e.g. a publishing deal goes to a separate editorial company), and
      // every artist folder is keyed by an internal code (e.g. "I0049").
      await sql`ALTER TABLE legal_contracts ADD COLUMN IF NOT EXISTS contraparte TEXT`;
      await sql`ALTER TABLE legal_contracts ADD COLUMN IF NOT EXISTS codigo_interno TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS legal_contracts_artist_idx ON legal_contracts (artist)`;
    })();
  }
  return ready;
}

// The three fixed categories a contract can be — matches the actual
// structure of the label's Legal drive (each artist folder holds up to
// one contract per category) and the three buttons on the artist ficha.
export const TIPOS_CONTRATO = ["Editorial", "Intérprete", "Representación"] as const;

export const ESTADOS_CONTRATO = ["Vigente", "Pendiente", "Vencido", "Rescindido", "Finalizado"] as const;

export type LegalContract = {
  id: string;
  artist: string;
  sello: string | null;
  tipoContrato: string;
  contraparte: string | null;
  codigoInterno: string | null;
  fechaFirma: string | null;
  fechaVencimiento: string | null;
  estado: string;
  documentoUrl: string | null;
  documentoNombre: string | null;
  notas: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

function rowToContract(r: Record<string, unknown>): LegalContract {
  return {
    id: r.id as string,
    artist: r.artist as string,
    sello: (r.sello as string | null) ?? null,
    tipoContrato: r.tipo_contrato as string,
    contraparte: (r.contraparte as string | null) ?? null,
    codigoInterno: (r.codigo_interno as string | null) ?? null,
    fechaFirma: (r.fecha_firma as string | null) ?? null,
    fechaVencimiento: (r.fecha_vencimiento as string | null) ?? null,
    estado: r.estado as string,
    documentoUrl: (r.documento_url as string | null) ?? null,
    documentoNombre: (r.documento_nombre as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

export async function listContracts(): Promise<LegalContract[]> {
  await ensureLegalSchema();
  const { rows } = await sql`
    SELECT * FROM legal_contracts ORDER BY artist ASC, fecha_firma DESC NULLS LAST
  `;
  return rows.map(rowToContract);
}

export async function getContract(id: string): Promise<LegalContract | null> {
  await ensureLegalSchema();
  const { rows } = await sql`SELECT * FROM legal_contracts WHERE id = ${id}`;
  return rows[0] ? rowToContract(rows[0]) : null;
}

export async function createContract(input: {
  artist: string;
  sello: string | null;
  tipoContrato: string;
  contraparte: string | null;
  codigoInterno: string | null;
  fechaFirma: string | null;
  fechaVencimiento: string | null;
  estado: string;
  documentoUrl: string | null;
  documentoNombre: string | null;
  notas: string | null;
  actorEmail: string;
}): Promise<LegalContract> {
  await ensureLegalSchema();
  const id = `legal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await sql`
    INSERT INTO legal_contracts
      (id, artist, sello, tipo_contrato, contraparte, codigo_interno, fecha_firma, fecha_vencimiento, estado, documento_url, documento_nombre, notas, updated_by, updated_at)
    VALUES
      (${id}, ${input.artist}, ${input.sello}, ${input.tipoContrato}, ${input.contraparte}, ${input.codigoInterno},
       ${input.fechaFirma}, ${input.fechaVencimiento}, ${input.estado}, ${input.documentoUrl}, ${input.documentoNombre},
       ${input.notas}, ${input.actorEmail}, now())
    RETURNING *
  `;
  return rowToContract(rows[0]);
}

export async function updateContract(
  id: string,
  input: {
    artist: string;
    sello: string | null;
    tipoContrato: string;
    contraparte: string | null;
    codigoInterno: string | null;
    fechaFirma: string | null;
    fechaVencimiento: string | null;
    estado: string;
    documentoUrl: string | null;
    documentoNombre: string | null;
    notas: string | null;
    actorEmail: string;
  }
): Promise<LegalContract | null> {
  await ensureLegalSchema();
  const { rows } = await sql`
    UPDATE legal_contracts SET
      artist = ${input.artist},
      sello = ${input.sello},
      tipo_contrato = ${input.tipoContrato},
      contraparte = ${input.contraparte},
      codigo_interno = ${input.codigoInterno},
      fecha_firma = ${input.fechaFirma},
      fecha_vencimiento = ${input.fechaVencimiento},
      estado = ${input.estado},
      documento_url = ${input.documentoUrl},
      documento_nombre = ${input.documentoNombre},
      notas = ${input.notas},
      updated_by = ${input.actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToContract(rows[0]) : null;
}
