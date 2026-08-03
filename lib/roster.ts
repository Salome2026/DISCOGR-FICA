import { normalizeName } from "./participants";
import type { Sello } from "./sellos";

export type RosterArtist = {
  id: string;
  name: string;
  aliases: string[];
};

// Curated, exact-match roster per sello. A track belongs to the sello if at
// least one of its parsed participants exactly matches one of these aliases
// (after normalization) — never by searching for the name as a substring of
// a longer credit string, which is what caused collabs/featurings to be
// miscounted as new artists.
export const SELLO_ROSTERS: Partial<Record<Sello, RosterArtist[]>> = {
  "MAWZ Records": [
    { id: "lit-killah", name: "Lit Killah", aliases: ["lit killah"] },
    { id: "gusty-dj", name: "Gusty DJ", aliases: ["gusty dj", "gusty djz"] },
    { id: "seven-kayne", name: "Seven Kayne", aliases: ["seven kayne"] },
  ],
  // From the artist dropdown in the Finanzas Artista app. "Gusty DJ" also
  // appeared there, but he's kept exclusively on MAWZ Records' roster above —
  // same precedent the old substring-based assignSello() used.
  "Indyana Records": [
    { id: "aneley", name: "Aneley", aliases: ["aneley"] },
    { id: "baby-cue", name: "Baby Cue", aliases: ["baby cue"] },
    { id: "bianca-lif", name: "Bianca Lif", aliases: ["bianca lif"] },
    { id: "cande-gonzalez", name: "Cande Gonzalez", aliases: ["cande gonzalez"] },
    { id: "candu-dominguez", name: "Candu Dominguez", aliases: ["candu dominguez"] },
    { id: "dj-plaga", name: "DJ Plaga", aliases: ["dj plaga"] },
    { id: "dormun", name: "Dormun", aliases: ["dormun"] },
    { id: "facuu-dj", name: "Facuu DJ", aliases: ["facuu dj"] },
    { id: "g-sony", name: "G Sony", aliases: ["g sony"] },
    { id: "laalo-dj", name: "Laalo DJ", aliases: ["laalo dj"] },
    { id: "lazer-k", name: "Lazer K", aliases: ["lazer k"] },
    { id: "more-savan", name: "More Savan", aliases: ["more savan"] },
    { id: "nicole-fernandez", name: "Nicole Fernandez", aliases: ["nicole fernandez"] },
    { id: "simo-viani", name: "Simo Viani", aliases: ["simo viani"] },
    { id: "sofi-b", name: "Sofi B", aliases: ["sofi b"] },
    { id: "toti", name: "Toti", aliases: ["toti"] },
    { id: "virrshi-dj", name: "Virrshi DJ", aliases: ["virrshi dj"] },
    { id: "juana-vincent", name: "Juana Vincent", aliases: ["juana vincent"] },
    { id: "tibbas", name: "Tibbas", aliases: ["tibbas"] },
  ],
  "Caserio Records": [
    { id: "eze-remix", name: "Eze Remix", aliases: ["eze remix"] },
    { id: "juanma-girat", name: "Juanma Girat", aliases: ["juanma girat"] },
    { id: "gnabry", name: "Gnabry", aliases: ["gnabry"] },
    { id: "los-anormales", name: "Los Anormales", aliases: ["los anormales"] },
    { id: "joaquin-arce", name: "Joaquín Arce", aliases: ["joaquin arce"] },
    { id: "eze-greco", name: "Eze Greco", aliases: ["eze greco"] },
    { id: "dura-dj", name: "Dura DJ", aliases: ["dura dj"] },
    { id: "tomi-rmx", name: "Tomi Rmx", aliases: ["tomi rmx"] },
    { id: "sossa", name: "Sossa", aliases: ["sossa"] },
  ],
};

export function matchRosterArtist(
  participant: string,
  roster: RosterArtist[]
): RosterArtist | null {
  const n = normalizeName(participant);
  for (const artist of roster) {
    if (artist.aliases.some((a) => normalizeName(a) === n)) return artist;
  }
  return null;
}
