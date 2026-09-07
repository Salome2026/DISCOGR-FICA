// Módulo OP — copia funcional de la planilla "Fonogramas MAWZ & INDYANA".
// Tipos planos, sin dependencia de @vercel/postgres, para poder importarse
// tanto desde la web como (a futuro) desde la app móvil.

export type OpAuditFields = {
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type OpOgs = OpAuditFields & {
  id: string;
  albumArtist: string | null;
  album: string | null;
  trackArtist: string;
  track: string;
  isrc: string | null;
  upc: string | null;
  releaseDate: string | null;
  year: number | null;
  provider: string | null;
  sello: string | null;
  // Nunca se guarda — se resuelve en vivo contra op_repertorio_capif
  // (ver lib/db/opOgs.ts) para que nunca quede desactualizado.
  capif: "SI" | "NO";
};

export type OpOgsInput = {
  albumArtist?: string | null;
  album?: string | null;
  trackArtist: string;
  track: string;
  isrc?: string | null;
  upc?: string | null;
  releaseDate?: string | null;
  year?: number | null;
  provider?: string | null;
  sello?: string | null;
};

export type OpRemix = OpAuditFields & {
  id: string;
  albumArtist: string | null;
  album: string | null;
  trackArtist: string;
  track: string;
  isrc: string | null;
  upc: string | null;
  releaseDate: string | null;
  provider: string | null;
  sello: string | null;
  extra: Record<string, unknown>;
};

export type OpRemixInput = {
  albumArtist?: string | null;
  album?: string | null;
  trackArtist: string;
  track: string;
  isrc?: string | null;
  upc?: string | null;
  releaseDate?: string | null;
  provider?: string | null;
  sello?: string | null;
};

export type OpIsrcAudio = OpAuditFields & {
  id: string;
  year: number;
  isrc: string | null;
  artista: string | null;
  track: string | null;
};

export type OpIsrcAudioInput = { year: number; isrc?: string | null; artista?: string | null; track?: string | null };

export type OpIsrcVideo = OpAuditFields & {
  id: string;
  year: number;
  isrc: string | null;
  artista: string | null;
  video: string | null;
};

export type OpIsrcVideoInput = { year: number; isrc?: string | null; artista?: string | null; video?: string | null };

export type OpParticipacion = OpAuditFields & {
  id: string;
  label: string | null;
  artists: string | null;
  track: string | null;
  isrc: string | null;
  participante: string | null;
  porcentaje: number | null;
  notas: string | null;
  extra: Record<string, unknown>;
};

export type OpParticipacionInput = {
  label?: string | null;
  artists?: string | null;
  track?: string | null;
  isrc?: string | null;
  participante?: string | null;
  porcentaje?: number | null;
  notas?: string | null;
};

export type OpRepertorioCapif = OpAuditFields & {
  id: string;
  titulo: string | null;
  album: string | null;
  artista: string | null;
  isrc: string;
  sello: string | null;
  titularDerecho: string | null;
  periodo: string | null;
  anioPublicacion: number | null;
  envioMonitoreo: string | null;
  capif: string | null;
};

export type OpRepertorioCapifInput = {
  titulo?: string | null;
  album?: string | null;
  artista?: string | null;
  isrc: string;
  sello?: string | null;
  titularDerecho?: string | null;
  periodo?: string | null;
  anioPublicacion?: number | null;
  envioMonitoreo?: string | null;
  capif?: string | null;
};

export type OpDuplicado = OpAuditFields & {
  id: string;
  albumArtist: string | null;
  album: string | null;
  trackArtist: string | null;
  track: string | null;
  isrc: string | null;
  upc: string | null;
  releaseDate: string | null;
  provider: string | null;
  baja: string | null;
};

export type OpDuplicadoInput = {
  albumArtist?: string | null;
  album?: string | null;
  trackArtist?: string | null;
  track?: string | null;
  isrc?: string | null;
  upc?: string | null;
  releaseDate?: string | null;
  provider?: string | null;
  baja?: string | null;
};

export type OpIndyanaOld = OpAuditFields & {
  id: string;
  titulo: string | null;
  releaseDate: string | null;
  isrc: string | null;
  isrcVideo: string | null;
  nombreEpLp: string | null;
  upc: string | null;
  mainArtists: string | null;
};

export type OpIndyanaOldInput = {
  titulo?: string | null;
  releaseDate?: string | null;
  isrc?: string | null;
  isrcVideo?: string | null;
  nombreEpLp?: string | null;
  upc?: string | null;
  mainArtists?: string | null;
};

export type OpTemp = OpAuditFields & {
  id: string;
  albumArtist: string | null;
  album: string | null;
  trackArtist: string | null;
  track: string | null;
  isrc: string | null;
  upc: string | null;
  releaseDate: string | null;
  providerOtw: string | null;
  notas: string | null;
};

export type OpTempInput = {
  albumArtist?: string | null;
  album?: string | null;
  trackArtist?: string | null;
  track?: string | null;
  isrc?: string | null;
  upc?: string | null;
  releaseDate?: string | null;
  providerOtw?: string | null;
  notas?: string | null;
};

// Fila de historial ya resuelta (ver lib/auditDiff.ts) para la ficha
// completa de cualquier tabla de OP.
export type OpAuditEntry = {
  id: number;
  email: string;
  action: string;
  at: string;
  cambios: { campo: string; valorAnterior: unknown; valorNuevo: unknown }[];
};

// Detección de duplicados en vivo (ISRC o UPC repetido entre op_ogs + op_remix).
export type OpDuplicateGroup = {
  key: string;
  tipo: "isrc" | "upc";
  filas: { tabla: "ogs" | "remix"; id: string; trackArtist: string; track: string; isrc: string | null; upc: string | null }[];
};
