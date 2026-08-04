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
    { id: "facuu-dj", name: "Facuu DJ", aliases: ["facuu dj", "facuudj"] },
    { id: "g-sony", name: "G Sony", aliases: ["g sony"] },
    { id: "laalo-dj", name: "Laalo DJ", aliases: ["laalo dj", "laalodj"] },
    { id: "lazer-k", name: "Lazer K", aliases: ["lazer k", "lazerk"] },
    { id: "more-savan", name: "More Savan", aliases: ["more savan"] },
    { id: "nicole-fernandez", name: "Nicole Fernandez", aliases: ["nicole fernandez"] },
    { id: "simo-viani", name: "Simo Viani", aliases: ["simo viani"] },
    { id: "sofi-b", name: "Sofi B", aliases: ["sofi b"] },
    { id: "toti", name: "Toti", aliases: ["toti"] },
    { id: "virrshi-dj", name: "Virrshi DJ", aliases: ["virrshi dj"] },
    { id: "juana-vincent", name: "Juana Vincent", aliases: ["juana vincent"] },
    { id: "tibbas", name: "Tibbas", aliases: ["tibbas"] },
    { id: "matias-mareco", name: "Matias Mareco", aliases: ["matias mareco"] },
    { id: "sergio-ponce", name: "Sergio Ponce", aliases: ["sergio ponce"] },
    { id: "pola-dj", name: "Pola DJ", aliases: ["pola dj"] },
    { id: "alan-gomez", name: "Alan Gomez", aliases: ["alan gomez"] },
  ],
  // Caserio Records intentionally has no entry here. This roster only
  // classifies tracks in the static data/tracks.json snapshot (an old
  // distributor export) for RosterSelloView — Caserio has no history in
  // that file. Giving it a roster would flip its sello page over to
  // RosterSelloView (see app/sellos/[nombre]/page.tsx's `hasRoster` check)
  // and away from CatalogTracksPanel, which is the one that reads live from
  // the catalog_tracks DB table where PM-loaded releases actually land.
};

// Caserio's roster, kept separate from SELLO_ROSTERS above for the reason
// noted there. Used for things that just need "our artists' names" — like
// picking who to sync with Chartmetric — without touching sello-page
// rendering.
export const CASERIO_ROSTER_NAMES = [
  "Eze Remix",
  "Juanma Girat",
  "Gnabry",
  "Los Anormales",
  "Joaquín Arce",
  "Eze Greco",
  "Dura DJ",
  "Tomi Rmx",
  "Sossa",
];

// Every artist actually signed to / working with one of our sellos — the
// roster lists above exist to classify tracks, but this flat name list is
// what things like the Chartmetric sync use to know who "our artists" are,
// as opposed to every artist in the wider catalog exports.
export function getAllRosterArtistNames(): string[] {
  const fromRosters = Object.values(SELLO_ROSTERS)
    .flat()
    .map((a) => a.name);
  return [...new Set([...fromRosters, ...CASERIO_ROSTER_NAMES])];
}

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
