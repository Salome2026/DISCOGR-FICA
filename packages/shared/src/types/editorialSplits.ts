// Extracted from lib/db/editorialSplits.ts — plain data shape only.

// Percentage scaled by 100 and rounded to an integer (16.8% -> 1680), so
// every layer works on exact integers instead of chasing floating point.
export type SplitPerson = {
  personId: string;
  personName: string;
  percentX100: number;
};

export type EditorialSplit = {
  id: string;
  catalogTrackId: string | null;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  letra: SplitPerson[];
  musica: SplitPerson[];
  letraUrl: string | null;
  letraNombre: string | null;
  audioUrl: string | null;
  estado: "Pendiente" | "Enviado";
  createdBy: string;
  createdAt: string;
  sentBy: string | null;
  sentAt: string | null;
};

export type SplitCard = {
  id: string;
  trackName: string;
  artistDisplay: string;
  estado: "Pendiente" | "Enviado";
  createdBy: string;
  createdAt: string;
  sentAt: string | null;
};

export type SplitTrackOption = {
  id: string;
  track: string;
  artistDisplay: string;
  sello: string | null;
  // Solo se conoce cuando la canción viene precargada desde un fonograma de
  // PM (link "Completar Split editorial") — no se busca de nuevo acá; es
  // solo para mostrarle al PM que el audio ya está y no hace falta subirlo.
  audioUrl?: string | null;
};

// Devuelto por la búsqueda de autores/compositores existentes — incluye la
// ficha completa (antes solo id+nombre) para poder autocompletar el resto
// de los campos apenas el PM elige a alguien ya cargado en Publishing.
export type SplitPersonOption = {
  id: string;
  nombreArtistico: string;
  nombreCompleto?: string | null;
  apellido?: string | null;
  dni?: string | null;
  direccion?: string | null;
  fechaNacimiento?: string | null;
  sadaic?: string | null;
  ipi?: string | null;
  email?: string | null;
};

export type SplitPersonInput =
  | { personId: string; percentX100: number }
  | {
      newPerson: {
        nombreArtistico: string;
        nombreCompleto?: string | null;
        email?: string | null;
        apellido?: string | null;
        dni?: string | null;
        direccion?: string | null;
        fechaNacimiento?: string | null;
        sadaic?: string | null;
        ipi?: string | null;
      };
      percentX100: number;
    };

// Documento de letra (nuevo, uno por envío de split, no por persona) y audio
// del fonograma — el audio nunca se sube de nuevo acá: si el split viene
// desde un fonograma ya cargado, el servidor toma el audio_url que ya existe
// en pm_releases en vez de pedírselo al PM.
export type SplitAttachments = {
  letraUrl: string | null;
  letraNombre: string | null;
  audioUrl: string | null;
};
