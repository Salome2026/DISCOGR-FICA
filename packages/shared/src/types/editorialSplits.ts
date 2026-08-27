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
};

export type SplitPersonOption = {
  id: string;
  nombreArtistico: string;
};

export type SplitPersonInput =
  | { personId: string; percentX100: number }
  | {
      newPerson: {
        nombreArtistico: string;
        email?: string | null;
        apellido?: string | null;
        dni?: string | null;
        direccion?: string | null;
        fechaNacimiento?: string | null;
        sadaic?: string | null;
      };
      percentX100: number;
    };
