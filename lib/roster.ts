import { sql } from "@vercel/postgres";
import { normalizeName } from "./participants";
import { listActiveStreamingProjects } from "./db/streamingProjects";
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
    { id: "acit-x", name: "Acit x", aliases: ["acit x"] },
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
// noted there. Used by lib/db/artists.ts for the Management artist
// directory — the growth/listener sync (getRosterArtistEntries below) reads
// catalog_tracks directly instead and doesn't touch this list.
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
  // Found via catalog_tracks participants (real Caserio-sello releases) —
  // this list was badly out of date and missing most of the roster.
  "Bruno Chavez Dj",
  "Dimelo Gabbo",
  "DJ Feed",
  "DJ Tra RKT",
  "Elam Mix",
  "Falcone",
  "Fede Tarifeño",
  "Gutti Ezequiel",
  "Ibanxo",
  "Juan Zapata DJ",
  "Maate DJ",
  "Mambo DJ",
  "Nahu In The Mix",
  "Nubrio",
  "Titan 13",
  "Ventu",
  "Zalo DJ",
  "Sheafiell",
];

export type RosterArtistEntry = { name: string; sello: string };

// Every artist actually signed to / working with one of our sellos — derived
// live from catalog_tracks (every PM-loaded release already tags each track
// with sello + participants) instead of the hand-maintained lists above, so
// a newly-signed artist's first release makes them show up here immediately,
// no code change or redeploy needed. Case/whitespace variants of the same
// name ("Gusty dj" vs "GUSTY DJ") collapse to one entry.
//
// "Streamings" is the one deliberate exception: its catalog rows list every
// artist who ever appeared on a compilation as a participant, but what the
// label actually wants tracked for that sello is the handful of channel
// profiles themselves (streaming_projects — admin-managed, e.g. "La Juntada
// de los Artistas"), not each guest artist.
export async function getRosterArtistEntries(): Promise<RosterArtistEntry[]> {
  const { rows } = await sql`
    SELECT sello, jsonb_array_elements_text(participants) AS name
    FROM catalog_tracks
    WHERE sello IS NOT NULL AND sello <> 'Streamings'
  `;
  const bySello = new Map<string, Map<string, string>>();
  for (const r of rows as { sello: string; name: string }[]) {
    const norm = normalizeName(r.name);
    if (!norm) continue;
    if (!bySello.has(r.sello)) bySello.set(r.sello, new Map());
    const seen = bySello.get(r.sello)!;
    if (!seen.has(norm)) seen.set(norm, r.name.trim());
  }

  const entries: RosterArtistEntry[] = [];
  for (const [sello, seen] of bySello) {
    for (const name of seen.values()) entries.push({ name, sello });
  }

  const streamingProjects = await listActiveStreamingProjects();
  for (const p of streamingProjects) entries.push({ name: p.name, sello: "Streamings" });

  return entries;
}

// Flat name list — what things like the Chartmetric sync use to know who
// "our artists" are, as opposed to every artist in the wider catalog exports.
export async function getAllRosterArtistNames(): Promise<string[]> {
  return (await getRosterArtistEntries()).map((e) => e.name);
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
