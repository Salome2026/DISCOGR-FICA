// Extracted from lib/notion.ts (Release/"acuerdos") and lib/db/catalog.ts
// (CatalogTrack) — the two data sources the admin Dashboard's KPI tiles are
// derived from (see app/dashboard/page.tsx).

export type Acuerdo = {
  id: string;
  nombre: string;
  compania: string | null;
  estado: string[];
  prioridad: string | null;
  porcentaje: number | null;
  audio: boolean;
  portada: boolean;
  acuerdo: boolean;
  responsable: string | null;
  comentario: string | null;
  url: string;
};

export type CatalogTrack = {
  id: string;
  isrc: string | null;
  track: string;
  album: string | null;
  release_date: string | null;
  upc: string | null;
  company: string | null;
  artist_display: string;
  participants: string[];
  sello: string | null;
  streaming_project: string | null;
  genero: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
};
