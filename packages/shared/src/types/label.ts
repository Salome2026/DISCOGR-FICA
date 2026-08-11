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

// Extracted from lib/db/royalties.ts.
export type PartyType = "sello" | "artista";
export type RoyaltySplit = {
  id: number;
  track_id: string;
  party_type: PartyType;
  party_name: string;
  percentage: number;
  created_at: string;
  updated_by: string | null;
};

// Extracted from lib/db/streamingProjects.ts.
export type StreamingProjectRow = {
  id: number;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
};

// Extracted from app/components/RankingListeners.tsx — matches GET /api/ranking.
export type RankingRow = {
  artist_id: string;
  artist_name: string;
  sello: string | null;
  monthly_listeners: number | null;
  followers: number | null;
  monthly_listeners_rank: number | null;
  artist_rank: number | null;
  image_url: string | null;
  measured_at: string;
  prev_day: number | null;
  prev_7d: number | null;
  prev_30d: number | null;
};
