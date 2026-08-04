import { sql } from "@vercel/postgres";
import { SELLO_ROSTERS, CASERIO_ROSTER_NAMES } from "@/lib/roster";
import type { Sello } from "@/lib/sellos";

let ready: Promise<void> | null = null;

export function ensureArtistsSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS artists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          aliases JSONB NOT NULL DEFAULT '[]',
          sello TEXT,
          instagram TEXT,
          tiktok TEXT,
          youtube TEXT,
          spotify TEXT,
          chartmetric_id INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT,
          updated_at TIMESTAMPTZ
        )
      `;
    })();
  }
  return ready;
}

export type Artist = {
  id: string;
  name: string;
  aliases: string[];
  sello: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  spotify: string | null;
  chartmetricId: number | null;
  updatedAt: string | null;
};

// Artists that only exist in the hardcoded rosters (lib/roster.ts, lib/sellos.ts)
// and have no row in the `artists` table yet — surfaced as search results with
// no socials on file, rather than being invisible until someone fills them in.
function staticRosterIndex(): { id: string; name: string; sello: string | null }[] {
  const out: { id: string; name: string; sello: string | null }[] = [];
  for (const [sello, roster] of Object.entries(SELLO_ROSTERS)) {
    for (const a of roster ?? []) out.push({ id: a.id, name: a.name, sello });
  }
  for (const name of CASERIO_ROSTER_NAMES) {
    out.push({ id: slugify(name), name, sello: "Caserio Records" });
  }
  return out;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artista";
}

function rowToArtist(r: Record<string, unknown>): Artist {
  return {
    id: r.id as string,
    name: r.name as string,
    aliases: (r.aliases as string[]) ?? [],
    sello: (r.sello as string | null) ?? null,
    instagram: (r.instagram as string | null) ?? null,
    tiktok: (r.tiktok as string | null) ?? null,
    youtube: (r.youtube as string | null) ?? null,
    spotify: (r.spotify as string | null) ?? null,
    chartmetricId: (r.chartmetric_id as number | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

function socialCount(a: { instagram: string | null; tiktok: string | null; youtube: string | null; spotify: string | null }): number {
  return [a.instagram, a.tiktok, a.youtube, a.spotify].filter(Boolean).length;
}

// Every artist known to the platform — DB rows plus static-roster names that
// don't have a DB row yet (with empty socials), deduped by id. Used to power
// both the admin management list and the search typeahead's full universe.
export async function listAllArtists(): Promise<Artist[]> {
  await ensureArtistsSchema();
  const { rows } = await sql`SELECT * FROM artists ORDER BY name ASC`;
  const dbArtists = rows.map(rowToArtist);
  const dbIds = new Set(dbArtists.map((a) => a.id));

  const staticOnly: Artist[] = staticRosterIndex()
    .filter((a) => !dbIds.has(a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      aliases: [],
      sello: a.sello,
      instagram: null,
      tiktok: null,
      youtube: null,
      spotify: null,
      chartmetricId: null,
      updatedAt: null,
    }));

  return [...dbArtists, ...staticOnly].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

// Typeahead search for the marketing-plan form: matches by name or alias
// (case/accent-insensitive substring), most useful (most socials filled in)
// and closest matches first.
export async function searchArtists(query: string, limit = 8): Promise<Artist[]> {
  const all = await listAllArtists();
  const q = normalize(query);
  if (!q) return [];
  const matches = all.filter(
    (a) => normalize(a.name).includes(q) || a.aliases.some((al) => normalize(al).includes(q))
  );
  matches.sort((a, b) => {
    const aStarts = normalize(a.name).startsWith(q) ? 0 : 1;
    const bStarts = normalize(b.name).startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const sc = socialCount(b) - socialCount(a);
    if (sc !== 0) return sc;
    return a.name.localeCompare(b.name, "es");
  });
  return matches.slice(0, limit);
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export async function getArtist(id: string): Promise<Artist | null> {
  await ensureArtistsSchema();
  const { rows } = await sql`SELECT * FROM artists WHERE id = ${id}`;
  return rows[0] ? rowToArtist(rows[0]) : null;
}

export async function upsertArtist(input: {
  id?: string;
  name: string;
  aliases: string[];
  sello: Sello | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  spotify: string | null;
  chartmetricId: number | null;
  actorEmail: string;
}): Promise<Artist> {
  await ensureArtistsSchema();
  const id = input.id || slugify(input.name);
  const { rows } = await sql`
    INSERT INTO artists (id, name, aliases, sello, instagram, tiktok, youtube, spotify, chartmetric_id, updated_by, updated_at)
    VALUES (
      ${id}, ${input.name}, ${JSON.stringify(input.aliases)}::jsonb, ${input.sello},
      ${input.instagram}, ${input.tiktok}, ${input.youtube}, ${input.spotify}, ${input.chartmetricId},
      ${input.actorEmail}, now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      aliases = EXCLUDED.aliases,
      sello = EXCLUDED.sello,
      instagram = EXCLUDED.instagram,
      tiktok = EXCLUDED.tiktok,
      youtube = EXCLUDED.youtube,
      spotify = EXCLUDED.spotify,
      chartmetric_id = EXCLUDED.chartmetric_id,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING *
  `;
  return rowToArtist(rows[0]);
}
