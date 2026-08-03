// Splits a raw "|"-joined artist-credit string (e.g. from data/tracks.json's
// artist_display field) into individual participant names, further breaking
// apart "feat." / "featuring" / "ft." / "and" / "," style collab credits that
// got left inside a single "|" segment (e.g. "GUSTY DJ feat. Big Apple").
//
// Deliberately does NOT split on bare "x", " y ", or "-": those show up as
// literal parts of real act names in this catalog (e.g. "ACIT x", "Maxi y La
// Champions Liga", "L-Gante") and splitting on them would fabricate artists.
const SUB_SPLIT_RE = /\s*(?:feat\.|featuring\b|ft\.|feat\b|ft\b)\s*|\s*,\s*|\s+and\s+/gi;

export function parseParticipants(artistDisplay: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const piece of artistDisplay.split("|")) {
    for (const sub of piece.split(SUB_SPLIT_RE)) {
      const name = sub.trim().replace(/^[-–—\s]+|[-–—\s]+$/g, "");
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
  }
  return out;
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
