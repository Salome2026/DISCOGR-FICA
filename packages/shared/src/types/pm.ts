// Matches the client-side Release type in app/pm/page.tsx (pm_releases rows,
// as returned by GET /api/pm/releases).

export const ESTADOS_RELEASE = ["Contactado", "Firmado", "Necesito ayuda"] as const;

export type PmRelease = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  estado: string;
  distribuidora: string | null;
  fecha_lanzamiento: string | null;
  hora_lanzamiento: string | null;
  autores_compositores: string | null;
  audio_url: string | null;
  portada_url: string | null;
  created_by: string;
  created_at: string;
  track_number: number | null;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
  streaming_project: string | null;
};
