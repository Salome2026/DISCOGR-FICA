// Extracted from lib/db/legalContracts.ts — plain data shape only, zero
// dependency on @vercel/postgres, so both web and the Expo mobile app can
// import it. lib/db/legalContracts.ts keeps owning the real type/consts.

export const TIPOS_CONTRATO = ["Editorial", "Intérprete", "Representación"] as const;

export const ESTADOS_CONTRATO = ["Vigente", "Pendiente", "Vencido", "Rescindido", "Finalizado", "Potencial"] as const;

export type LegalContract = {
  id: string;
  artist: string;
  sello: string | null;
  tipoContrato: string;
  contraparte: string | null;
  codigoInterno: string | null;
  firmantes: string | null;
  fonograma: string | null;
  fechaFirma: string | null;
  fechaVencimiento: string | null;
  estado: string;
  documentoUrl: string | null;
  documentoNombre: string | null;
  notas: string | null;
  docusignEnvelopeId: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type LegalArtist = { id: string; name: string; sello: string | null; photoUrl: string | null };
