// Extracted plain data shapes for the A&R module — zero dependency on
// @vercel/postgres, so both web and the Expo mobile app can import them.
// lib/db/arOpportunities.ts owns the actual DB read/write logic.

export const AR_CATEGORIES = [
  "NUEVO TALENTO",
  "CANCIÓN EN CRECIMIENTO",
  "AUDIO VIRAL",
  "ARTISTA EN CRECIMIENTO",
  "TENDENCIA",
  "OPORTUNIDAD DE FEATURING",
  "OPORTUNIDAD DE REMIX",
  "OPORTUNIDAD DE FIRMA",
  "OPORTUNIDAD DE CONTENIDO",
  "OPORTUNIDAD DE CATÁLOGO",
  "SEGUIMIENTO",
] as const;
export type ArCategory = (typeof AR_CATEGORIES)[number];

// Full status workflow, in the order a card is expected to move through it
// (not enforced in code — a human can jump straight to DESCARTADO from
// NUEVO, for example).
export const AR_STATUSES = [
  "NUEVO",
  "REVISANDO",
  "SEGUIR",
  "CONTACTAR",
  "CONTACTADO",
  "EN NEGOCIACIÓN",
  "DERIVADO A PM",
  "DESCARTADO",
  "INCORPORADO",
  "ARCHIVADO",
] as const;
export type ArStatus = (typeof AR_STATUSES)[number];

export const AR_SUBJECT_TYPES = [
  "artist_external",
  "artist_label",
  "track_external",
  "track_label",
  "sound_tiktok",
  "trend_general",
] as const;
export type ArSubjectType = (typeof AR_SUBJECT_TYPES)[number];

export const AR_SOURCE_TYPES = [
  "chartmetric_watchlist",
  "youtube_trending_ar",
  "apple_music_charts_ar",
  "manual_tiktok",
  "manual_other",
  "manual_watchlist_seed",
] as const;
export type ArSourceType = (typeof AR_SOURCE_TYPES)[number];

export type ArSource = {
  type: string;
  label: string;
  url: string | null;
  asOf: string | null;
  note: string | null;
};

export type ArScoreBreakdown = {
  growth: number | null;
  crossSourceConfirmation: number | null;
  labelCompatibility: number | null;
  freshness: number | null;
};

export type ArCompatibilityMatch = {
  name: string;
  sello: string | null;
  sharedGenre: boolean;
  hasCollabHistory: boolean;
};

export type ArCompatibility = {
  matchedArtists: ArCompatibilityMatch[];
  suggestedAction: string | null;
  suggestedSello: string | null;
};

export type ArNarrative = {
  queEstaPasando: string;
  porQueImporta: string;
  impactoArgentina: string;
  recomendacion: string;
  generatedAt: string;
};

export type ArOpportunity = {
  id: string;
  category: ArCategory;
  title: string;
  status: ArStatus;
  opportunityScore: number | null;
  scoringVersion: string | null;
  scoreBreakdown: ArScoreBreakdown | null;
  subjectType: ArSubjectType;
  subjectKey: string | null;
  subjectName: string;
  regionFocus: "AR" | "foreign_relevant_to_ar";
  relatedLabelArtist: string | null;
  suggestedSello: string | null;
  metrics: Record<string, unknown> | null;
  compatibility: ArCompatibility | null;
  narrative: ArNarrative | null;
  sources: ArSource[];
  dataUnavailableNote: string | null;
  sourceType: ArSourceType;
  assignedPmEmail: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  archived: boolean;
};

export type ArOpportunityComment = {
  id: number;
  opportunityId: string;
  authorEmail: string;
  body: string;
  createdAt: string;
};

export type ArTaskStatus = "pending" | "acknowledged" | "done";

export type ArOpportunityAssignment = {
  id: number;
  opportunityId: string;
  pmEmail: string;
  assignedBy: string;
  comment: string | null;
  taskStatus: ArTaskStatus;
  assignedAt: string;
  completedAt: string | null;
};

// What a manual entry (e.g. a TikTok observation) submits — everything else
// on ArOpportunity is either server-computed or defaulted.
export type ArOpportunityInput = {
  category: ArCategory;
  title: string;
  subjectType: ArSubjectType;
  subjectName: string;
  subjectKey?: string | null;
  regionFocus?: "AR" | "foreign_relevant_to_ar";
  suggestedSello?: string | null;
  sources: ArSource[];
  dataUnavailableNote?: string | null;
};

export type ArOpportunityUpdate = {
  status?: ArStatus;
  category?: ArCategory;
  suggestedSello?: string | null;
};
