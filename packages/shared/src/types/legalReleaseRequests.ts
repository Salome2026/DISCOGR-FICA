// Datos de derechos de máster/fonograma (quién es dueño de qué % de la
// grabación) — snapshot propio, deliberadamente no ligado a
// publishing_artists (esa tabla es de derechos editoriales/SADAIC, un
// concepto distinto aunque la misma persona real pueda aparecer en ambas).
export type ReleaseParticipant = {
  nombre: string;
  apellido: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  domicilio: string | null;
  email: string | null;
  percentX100: number;
};

// Clasificación del Release completo (no por participante): de qué lado
// viene — le indica a Legal de qué forma procesarlo apenas lo abre.
export const RELEASE_TIPOS = ["Artista", "Sello", "PPD"] as const;
export type ReleaseTipo = (typeof RELEASE_TIPOS)[number];

export type LegalReleaseRequest = {
  id: string;
  pmReleaseId: number;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  tipo: ReleaseTipo | null;
  participants: ReleaseParticipant[];
  estado: "Pendiente de envío" | "Enviado";
  createdBy: string;
  createdAt: string;
  sentBy: string | null;
  sentAt: string | null;
};

export type ReleaseRequestCard = {
  id: string;
  trackName: string;
  artistDisplay: string;
  tipo: ReleaseTipo | null;
  estado: "Pendiente de envío" | "Enviado";
  createdBy: string;
  createdAt: string;
  sentAt: string | null;
};
