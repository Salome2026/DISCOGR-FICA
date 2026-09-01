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
      // Management module fields — a fixed (manually curated, not
      // dynamically computed) chart position, a curation photo separate
      // from Rizzvor's own per-project photos, a general status, and a
      // musical genre (same GENEROS list as Rizzvor's per-project genero
      // column, but this is a separate column on a different table).
      await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS photo_url TEXT`;
      await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS chart_position INTEGER`;
      await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS estado_general TEXT`;
      await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS genero TEXT`;
      await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS notas TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS artists_chart_position_idx ON artists (chart_position) WHERE chart_position IS NOT NULL`;
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
  photoUrl: string | null;
  chartPosition: number | null;
  estadoGeneral: string | null;
  genero: string | null;
  notas: string | null;
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
    photoUrl: (r.photo_url as string | null) ?? null,
    chartPosition: (r.chart_position as number | null) ?? null,
    estadoGeneral: (r.estado_general as string | null) ?? null,
    genero: (r.genero as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
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
      photoUrl: null,
      chartPosition: null,
      estadoGeneral: null,
      genero: null,
      notas: null,
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

// Insert-if-missing, never overwrites — guarantees a real row exists the
// moment an artist is assigned to a PM (lib/db/pmArtistAssignments.ts), even
// if until now they only existed in the static roster. Not an editing path;
// updateArtistManagementFields/upsertArtist stay the only ones that mutate.
export async function ensureArtistExists(id: string, name: string, actorEmail: string): Promise<void> {
  await ensureArtistsSchema();
  const sello = staticRosterIndex().find((a) => a.id === id)?.sello ?? null;
  await sql`
    INSERT INTO artists (id, name, aliases, sello, updated_by, updated_at)
    VALUES (${id}, ${name}, '[]'::jsonb, ${sello}, ${actorEmail}, now())
    ON CONFLICT (id) DO NOTHING
  `;
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

// Management-only fields, deliberately separate from upsertArtist (the
// admin identity-CRUD path) — editar_management should never grant
// rename/social-edit rights. Many artists returned by listAllArtists() are
// "static roster only" with no row in this table yet, so this upserts a
// minimal row rather than assuming one exists.
export async function updateArtistManagementFields(
  id: string,
  name: string,
  input: { photoUrl?: string | null; chartPosition?: number | null; estadoGeneral?: string | null; genero?: string | null; notas?: string | null },
  actorEmail: string
): Promise<Artist> {
  await ensureArtistsSchema();
  const current = await getArtist(id);
  const photoUrl = input.photoUrl !== undefined ? input.photoUrl : current?.photoUrl ?? null;
  const chartPosition = input.chartPosition !== undefined ? input.chartPosition : current?.chartPosition ?? null;
  const estadoGeneral = input.estadoGeneral !== undefined ? input.estadoGeneral : current?.estadoGeneral ?? null;
  const genero = input.genero !== undefined ? input.genero : current?.genero ?? null;
  const notas = input.notas !== undefined ? input.notas : current?.notas ?? null;
  // An artist with no row yet (curation-only fields have never been touched
  // for them) is often still "static roster only" — falling straight to
  // null here silently detached them from their label the first time anyone
  // set a photo/estado/genero, since the static roster's sello only applies
  // via listAllArtists()'s merge and stops being consulted the moment a real
  // row exists.
  const sello = current?.sello ?? staticRosterIndex().find((a) => a.id === id)?.sello ?? null;
  const { rows } = await sql`
    INSERT INTO artists (id, name, aliases, sello, photo_url, chart_position, estado_general, genero, notas, updated_by, updated_at)
    VALUES (${id}, ${name}, '[]'::jsonb, ${sello}, ${photoUrl}, ${chartPosition}, ${estadoGeneral}, ${genero}, ${notas}, ${actorEmail}, now())
    ON CONFLICT (id) DO UPDATE SET
      photo_url = EXCLUDED.photo_url,
      chart_position = EXCLUDED.chart_position,
      estado_general = EXCLUDED.estado_general,
      genero = EXCLUDED.genero,
      notas = EXCLUDED.notas,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING *
  `;
  return rowToArtist(rows[0]);
}

// Whole-sequence rewrite so positions can never collide — simpler than a
// two-step swap, and cheap enough at roster scale (tens of artists, not
// thousands).
export async function reorderArtistChartPositions(
  ordered: { id: string; name: string; sello: string | null }[],
  actorEmail: string
): Promise<void> {
  await ensureArtistsSchema();
  for (let i = 0; i < ordered.length; i++) {
    const { id, name, sello } = ordered[i];
    // ON CONFLICT's UPDATE branch never touches `sello`, so this only seeds
    // it on a genuinely new row (e.g. an artist that so far only existed in
    // the static roster) — it can't clobber an existing DB row's value.
    await sql`
      INSERT INTO artists (id, name, aliases, sello, chart_position, updated_by, updated_at)
      VALUES (${id}, ${name}, '[]'::jsonb, ${sello}, ${i + 1}, ${actorEmail}, now())
      ON CONFLICT (id) DO UPDATE SET
        chart_position = ${i + 1},
        updated_by = ${actorEmail},
        updated_at = now()
    `;
  }
}
