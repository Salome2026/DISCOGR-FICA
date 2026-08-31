import { sql } from "@vercel/postgres";
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
  const roster = await getAllRosterArtistNames();
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

// Which real roster artists (excluding "Remix" — credited remixers of
// someone else's track, not signed roster artists, see lib/roster.ts) have
// already released in this genre — used by the catalog-revival scan to
// suggest who could feature/remix/relaunch an old track when its genre
// starts trending again. Genre match is direct (catalog_tracks.genero) with
// a fallback through the label's own genre-tagged Spotify playlists for
// tracks that never got a genero value at load time.
export async function findCompatibleRosterArtistsForGenre(
  genre: string,
  excludeArtistName: string
): Promise<ArCompatibilityMatch[]> {
  const rosterNames = await getAllRosterArtistNames({ excludeSellos: ["Remix"] });
  const rosterByNorm = new Map(rosterNames.map((n) => [n.trim().toLowerCase(), n]));
  const excludeNorm = excludeArtistName.trim().toLowerCase();

  const direct = await sql`
    SELECT DISTINCT jsonb_array_elements_text(participants) AS name, sello
    FROM catalog_tracks
    WHERE genero ILIKE ${genre}
  `;
  const viaPlaylist = await sql`
    SELECT DISTINCT jsonb_array_elements_text(ct.participants) AS name, ct.sello
    FROM catalog_tracks ct
    JOIN spotify_playlist_tracks spt ON spt.catalog_track_id = ct.id AND spt.removed_at IS NULL
    JOIN spotify_playlists sp ON sp.id = spt.playlist_id
    WHERE ct.genero IS NULL AND sp.genre ILIKE ${genre}
  `;

  const matches = new Map<string, ArCompatibilityMatch>();
  for (const row of [...direct.rows, ...viaPlaylist.rows] as { name: string; sello: string | null }[]) {
    const norm = row.name.trim().toLowerCase();
    if (!norm || norm === excludeNorm || matches.has(norm)) continue;
    const rosterName = rosterByNorm.get(norm);
    if (!rosterName) continue;

    const history = await getArtistCatalogHistory(rosterName, 20);
    const hasCollabHistory = history.some((t) =>
      t.participants.some((p) => p.trim().toLowerCase() === excludeNorm)
    );
    matches.set(norm, {
      name: rosterName,
      sello: row.sello ?? assignSello(rosterName),
      sharedGenre: true,
      hasCollabHistory,
    });
  }
  return [...matches.values()];
}
