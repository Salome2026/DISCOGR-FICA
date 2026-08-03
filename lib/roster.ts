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
