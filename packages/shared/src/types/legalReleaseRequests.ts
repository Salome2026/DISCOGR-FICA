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

export type LegalReleaseRequest = {
  id: string;
  pmReleaseId: number;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  participants: ReleaseParticipant[];
  estado: "Pendiente de envío" | "Revisado";
  createdBy: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type ReleaseRequestCard = {
  id: string;
  trackName: string;
  artistDisplay: string;
  estado: "Pendiente de envío" | "Revisado";
  createdBy: string;
  createdAt: string;
  reviewedAt: string | null;
};
