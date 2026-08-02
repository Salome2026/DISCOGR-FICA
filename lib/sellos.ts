export const SELLOS = [
  "MAWZ Records",
  "Indyana Records",
  "Caserio Records",
  "Rizzvor",
  "Cach House",
  "La Juntada de los Artistas",
  "Streamings",
] as const;

export type Sello = (typeof SELLOS)[number];

const MAWZ_ARTISTS = ["lit killah", "gusty dj", "gusty djz"];
const INDYANA_ARTISTS = ["bianca lif", "nicole fernandez", "nicole fernández", "dsp"];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function assignSello(artist: string): Sello | null {
  const a = norm(artist);
  if (!a) return null;
  if (a.includes("la juntada")) return "La Juntada de los Artistas";
  if (MAWZ_ARTISTS.some((n) => a.includes(n))) return "MAWZ Records";
  if (INDYANA_ARTISTS.some((n) => a.includes(n))) return "Indyana Records";
  return null;
}
