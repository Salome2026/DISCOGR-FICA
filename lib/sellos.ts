export const SELLOS = [
  "MAWZ Records",
  "Indyana Records",
  "Caserio Records",
  "Rizzvor",
  "Cach House",
  "Streamings",
] as const;

export type Sello = (typeof SELLOS)[number];

// Streamings is a container: these are its individual projects, not top-level
// sellos. A track "belongs to" Streamings (sello field) and, within that, to
// one of these projects (streaming_project field) — same two-level split as
// sello vs distribuidora.
export const STREAMING_PROJECTS = [
  "La Juntada de los Artistas",
  "Sin Guion",
  "Para el Mundo",
  "Rock & Show",
] as const;

export type StreamingProject = (typeof STREAMING_PROJECTS)[number];

const MAWZ_ARTISTS = ["lit killah", "gusty dj", "gusty djz"];
// Full Indyana Records roster, from the artist dropdown in the Finanzas Artista app.
// Note: "gusty dj" is checked against MAWZ first (see assignSello order below), so it
// resolves to MAWZ Records even though it also appears on Indyana's own roster.
const INDYANA_ARTISTS = [
  "aneley",
  "baby cue",
  "bianca lif",
  "cande gonzalez",
  "candu dominguez",
  "dj plaga",
  "dormun",
  "facuu dj",
  "g sony",
  "gusty dj",
  "laalo dj",
  "lazer k",
  "more savan",
  "nicole fernandez",
  "simo viani",
  "sofi b",
  "toti",
  "virrshi dj",
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function assignSello(artist: string): Sello | null {
  const a = norm(artist);
  if (!a) return null;
  if (a.includes("la juntada")) return "Streamings";
  if (MAWZ_ARTISTS.some((n) => a.includes(n))) return "MAWZ Records";
  if (INDYANA_ARTISTS.some((n) => a.includes(n))) return "Indyana Records";
  return null;
}
