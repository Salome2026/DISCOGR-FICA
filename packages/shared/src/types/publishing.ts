// Extracted from lib/db/publishingArtists.ts — plain data shape only, zero
// dependency on @vercel/postgres.

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
