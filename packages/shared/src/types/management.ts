// Extracted from lib/db/managementArtists.ts and lib/db/managementReleases.ts
// — plain data shapes only, zero dependency on @vercel/postgres.

export type ManagementArtistRow = {
  id: string;
  name: string;
  sello: string | null;
  photoUrl: string | null;
  chartPosition: number | null;
  estadoGeneral: string | null;
  genero: string | null;
  monthlyListeners: number | null;
  nextRelease: { titulo: string; fecha: string; hora: string | null; estado: string } | null;
};

export type ManagementReleaseRow = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  estado: string;
  distribuidora: string | null;
  fecha_lanzamiento: string;
  hora_lanzamiento: string | null;
  colaboradores: string | null;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
  marketing_plan: boolean;
  marketing_plan_detalle: string | null;
  portada_url: string | null;
};
