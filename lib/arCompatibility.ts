import { getArtistCatalogHistory } from "@/lib/db/catalog";
import { getAllRosterArtistNames } from "@/lib/roster";
import { assignSello } from "@discografica/shared/sellos";
import type { ArCompatibility, ArCompatibilityMatch } from "@discografica/shared/types/ar";

// Deterministic cross-reference against the label's own roster/catalog —
// no LLM involved. Called both for a genuinely external candidate (does
// this look like anyone we already have?) and for our own roster artists
// (Etapa 2a), where the match is close to trivial but the shape is the
// same either way, so downstream code (scoring, the UI) never has to
// special-case "is this subject one of ours".
export async function crossReferenceArtist(subjectName: string): Promise<ArCompatibility> {
  const roster = getAllRosterArtistNames();
  const normalized = subjectName.trim().toLowerCase();
  const rosterMatch = roster.find((n) => n.toLowerCase() === normalized);

  const matchedArtists: ArCompatibilityMatch[] = [];
  let suggestedAction: string | null = null;
  let suggestedSello: string | null = null;

  if (rosterMatch) {
    const sello = assignSello(rosterMatch);
    const history = await getArtistCatalogHistory(rosterMatch, 8);
    matchedArtists.push({
      name: rosterMatch,
      sello,
      sharedGenre: true, // it's literally the same artist
      hasCollabHistory: history.length > 0,
    });
    suggestedSello = sello;
    suggestedAction = history.length > 0 ? "Evaluar reactivación de catálogo" : null;
  }

  return { matchedArtists, suggestedAction, suggestedSello };
}
