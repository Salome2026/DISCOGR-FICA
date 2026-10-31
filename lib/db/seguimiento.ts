import { sql } from "@vercel/postgres";
import { assignSello } from "@/lib/sellos";
import { slugify, listAllArtists } from "./artists";
import { getRankingLatest } from "./listeners";
import { getManagementReleaseEvents } from "./managementReleases";
import { ensureBookingSchema } from "./booking";
import { ensureCatalogSchema } from "./catalog";

// Seguimiento de proyectos — una sola vista para revisar 2-3 veces por
// semana el estado de cada unidad de la compañía (artistas, streamings,
// fiestas, sellos, subsellos, productores, premiaciones, distribución).
//
// Dos capas: lo que se carga a mano en cada revisión (estado, foco actual,
// próximo paso, temas de autoría propia — cosas que ningún otro módulo
// sabe) y lo que se calcula solo cruzando datos que VPO ya tiene (shows de
// la agenda de Booking, lanzamientos del catálogo/PM, oyentes de
// Chartmetric). Igual que el resto del código, el cruce es por nombre
// normalizado, no por foreign key.

export const TIPOS_UNIDAD = [
  "artista",
  "streaming",
  "fiesta",
  "sello",
  "subsello",
  "productor",
  "premiacion",
  "distribucion",
] as const;
export type TipoUnidad = (typeof TIPOS_UNIDAD)[number];

export const ESTADOS_SEGUIMIENTO = ["en_marcha", "atencion", "frenado", "sin_revisar"] as const;
export type EstadoSeguimiento = (typeof ESTADOS_SEGUIMIENTO)[number];

type Seed = {
  tipo: TipoUnidad;
  name: string;
  sello?: string | null;
  aliases?: string[];
  prioridad?: boolean;
  info?: string;
};

// Carga inicial: el pizarrón de la oficina (octubre 2026). "/B" = Bruma,
// "/C" = Caserio; el resto toma el sello del roster existente. Los nombres
// usan la grafía del roster/catálogo cuando ya existía, con la del pizarrón
// como alias para que el cruce con agenda y catálogo encuentre ambas.
const SEED: Seed[] = [
  // Artistas — columna 1
  { tipo: "artista", name: "Lit Killah", sello: "MAWZ Records" },
  { tipo: "artista", name: "Gusty DJ", sello: "MAWZ Records", aliases: ["gusty djz"] },
  { tipo: "artista", name: "Candu Dominguez", aliases: ["cando dominguez", "candu domingues"] },
  { tipo: "artista", name: "G Sony", aliases: ["g-sony"] },
  { tipo: "artista", name: "Aneley" },
  { tipo: "artista", name: "DJ Plaga" },
  { tipo: "artista", name: "Sofi B" },
  { tipo: "artista", name: "El Lauti" },
  { tipo: "artista", name: "Destino San Javier", prioridad: true },
  { tipo: "artista", name: "Jacinta" },
  { tipo: "artista", name: "Dúo Aruma", aliases: ["duo aruma"] },
  { tipo: "artista", name: "Franco Arroyo" },
  { tipo: "artista", name: "Cande Gonzalez" },
  { tipo: "artista", name: "Nicole Fernandez" },
  { tipo: "artista", name: "Nathali Torres", sello: "Bruma Records" },
  { tipo: "artista", name: "Eze Remix", sello: "Caserio Records" },
  { tipo: "artista", name: "Simo Viani" },
  { tipo: "artista", name: "Laalo DJ", aliases: ["laalodj", "caalo dj"] },
  // Artistas — columna 2
  { tipo: "artista", name: "Virrshi DJ", aliases: ["vireshi dj"] },
  { tipo: "artista", name: "Facuu DJ", aliases: ["facuudj"] },
  { tipo: "artista", name: "Lazer K", aliases: ["lazerk"] },
  { tipo: "artista", name: "Damián Bravo", aliases: ["dami bravo", "damian bravo"] },
  { tipo: "artista", name: "El Retutu", aliases: ["retutu"] },
  { tipo: "artista", name: "Toti" },
  { tipo: "artista", name: "Los Ke Mandan" },
  { tipo: "artista", name: "Juano DSKT" },
  { tipo: "artista", name: "Benji Granitos" },
  { tipo: "artista", name: "Belén Dipolito", sello: "Bruma Records", aliases: ["belen dipolito"] },
  { tipo: "artista", name: "Camira", sello: "Bruma Records" },
  { tipo: "artista", name: "Bauti 06", sello: "Bruma Records", aliases: ["bautista acevedo"] },
  { tipo: "artista", name: "Cynthia", sello: "Bruma Records", aliases: ["cintia ruiz"] },
  { tipo: "artista", name: "More Savan" },
  { tipo: "artista", name: "Dormun" },
  { tipo: "artista", name: "Matías Mareco", aliases: ["matias mareco"] },
  { tipo: "artista", name: "Los Anormales", sello: "Caserio Records" },
  { tipo: "artista", name: "Joaquín Arce", sello: "Caserio Records", aliases: ["joaquin arce"] },
  { tipo: "artista", name: "Juana Vincent", sello: "Caserio Records" },
  { tipo: "artista", name: "Juanma Girat", sello: "Caserio Records" },
  // Sellos / subsellos — `sello` es el nombre exacto de SELLOS para cruzar
  // con catalog_tracks.sello.
  { tipo: "sello", name: "MAWZ Records", sello: "MAWZ Records" },
  { tipo: "sello", name: "Indyana Records", sello: "Indyana Records" },
  { tipo: "sello", name: "Caserio Records", sello: "Caserio Records" },
  { tipo: "sello", name: "Cach House", sello: "Cach House" },
  { tipo: "subsello", name: "Bruma Records", sello: "Bruma Records" },
  { tipo: "subsello", name: "Sector Nine", sello: "Sector Nine" },
  // Fiestas
  { tipo: "fiesta", name: "Cach House" },
  { tipo: "fiesta", name: "Caserio" },
  { tipo: "fiesta", name: "Promise" },
  // Productores (nombres a confirmar: tomados de la foto del pizarrón)
  { tipo: "productor", name: "Fae" },
  { tipo: "productor", name: "Elías López", aliases: ["elias lopez"] },
  // Premiaciones
  { tipo: "premiacion", name: "Cleopatra" },
  // Streamings
  { tipo: "streaming", name: "La Juntada de los Artistas" },
  { tipo: "streaming", name: "Para el Mundo" },
  { tipo: "streaming", name: "Rock & Show" },
  { tipo: "streaming", name: "La Casa del DJ" },
  { tipo: "streaming", name: "Museo del Rock" },
  { tipo: "streaming", name: "Sin Guion" },
  { tipo: "streaming", name: "Vivamos Hip Hop" },
  { tipo: "streaming", name: "La Juntada del Folklore" },
  // Distribución
  { tipo: "distribucion", name: "Distribución VPO", info: "Todo lo que sale por nuestra distribución." },
];

export function unitId(tipo: string, name: string): string {
  return `${tipo}-${slugify(name)}`;
}

let ready: Promise<void> | null = null;

export function ensureSeguimientoSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS seguimiento_units (
          id TEXT PRIMARY KEY,
          tipo TEXT NOT NULL,
          name TEXT NOT NULL,
          sello TEXT,
          aliases JSONB NOT NULL DEFAULT '[]',
          photo_url TEXT,
          info TEXT,
          estado TEXT NOT NULL DEFAULT 'sin_revisar',
          foco TEXT,
          proximo_paso TEXT,
          autoria_propia INTEGER,
          prioridad BOOLEAN NOT NULL DEFAULT false,
          sort_order INTEGER NOT NULL DEFAULT 0,
          active BOOLEAN NOT NULL DEFAULT true,
          last_review_at TIMESTAMPTZ,
          last_review_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ,
          updated_by TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS seguimiento_reviews (
          id BIGSERIAL PRIMARY KEY,
          unit_id TEXT NOT NULL,
          estado TEXT NOT NULL,
          foco TEXT,
          proximo_paso TEXT,
          nota TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_by TEXT
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS seguimiento_reviews_unit_idx ON seguimiento_reviews (unit_id, created_at DESC)`;

      const { rows } = await sql`SELECT count(*) FROM seguimiento_units`;
      if (Number(rows[0].count) === 0) {
        for (let i = 0; i < SEED.length; i++) {
          const s = SEED[i];
          const sello = s.sello !== undefined ? s.sello : s.tipo === "artista" ? assignSello(s.name) : null;
          await sql`
            INSERT INTO seguimiento_units (id, tipo, name, sello, aliases, info, prioridad, sort_order, updated_by)
            VALUES (${unitId(s.tipo, s.name)}, ${s.tipo}, ${s.name}, ${sello}, ${JSON.stringify(s.aliases ?? [])}::jsonb,
              ${s.info ?? null}, ${s.prioridad ?? false}, ${i}, 'seed')
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }
    })();
  }
  return ready;
}

export type SeguimientoUnit = {
  id: string;
  tipo: TipoUnidad;
  name: string;
  sello: string | null;
  aliases: string[];
  photoUrl: string | null;
  info: string | null;
  estado: EstadoSeguimiento;
  foco: string | null;
  proximoPaso: string | null;
  autoriaPropia: number | null;
  prioridad: boolean;
  sortOrder: number;
  active: boolean;
  lastReviewAt: string | null;
  lastReviewBy: string | null;
};

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function rowToUnit(r: Record<string, unknown>): SeguimientoUnit {
  return {
    id: r.id as string,
    tipo: r.tipo as TipoUnidad,
    name: r.name as string,
    sello: (r.sello as string | null) ?? null,
    aliases: (r.aliases as string[]) ?? [],
    photoUrl: (r.photo_url as string | null) ?? null,
    info: (r.info as string | null) ?? null,
    estado: ((r.estado as string) ?? "sin_revisar") as EstadoSeguimiento,
    foco: (r.foco as string | null) ?? null,
    proximoPaso: (r.proximo_paso as string | null) ?? null,
    autoriaPropia: (r.autoria_propia as number | null) ?? null,
    prioridad: Boolean(r.prioridad),
    sortOrder: Number(r.sort_order ?? 0),
    active: Boolean(r.active),
    lastReviewAt: toIso(r.last_review_at),
    lastReviewBy: (r.last_review_by as string | null) ?? null,
  };
}

export async function listUnits(includeInactive = false): Promise<SeguimientoUnit[]> {
  await ensureSeguimientoSchema();
  const { rows } = includeInactive
    ? await sql`SELECT * FROM seguimiento_units ORDER BY sort_order ASC, name ASC`
    : await sql`SELECT * FROM seguimiento_units WHERE active = true ORDER BY sort_order ASC, name ASC`;
  return rows.map(rowToUnit);
}

export async function getUnit(id: string): Promise<SeguimientoUnit | null> {
  await ensureSeguimientoSchema();
  const { rows } = await sql`SELECT * FROM seguimiento_units WHERE id = ${id}`;
  return rows[0] ? rowToUnit(rows[0]) : null;
}

export async function createUnit(
  input: { tipo: TipoUnidad; name: string; sello?: string | null; info?: string | null },
  actorEmail: string
): Promise<SeguimientoUnit> {
  await ensureSeguimientoSchema();
  const id = unitId(input.tipo, input.name);
  const { rows: maxRows } = await sql`SELECT COALESCE(MAX(sort_order), -1) AS m FROM seguimiento_units`;
  const order = Number(maxRows[0].m) + 1;
  const sello = input.sello ?? (input.tipo === "artista" ? assignSello(input.name) : null);
  // Re-crear una unidad archivada la reactiva en vez de fallar por id duplicado.
  const { rows } = await sql`
    INSERT INTO seguimiento_units (id, tipo, name, sello, info, sort_order, updated_by, updated_at)
    VALUES (${id}, ${input.tipo}, ${input.name}, ${sello}, ${input.info ?? null}, ${order}, ${actorEmail}, now())
    ON CONFLICT (id) DO UPDATE SET active = true, updated_by = ${actorEmail}, updated_at = now()
    RETURNING *
  `;
  return rowToUnit(rows[0]);
}

export type UnitPatch = {
  name?: string;
  sello?: string | null;
  aliases?: string[];
  photoUrl?: string | null;
  info?: string | null;
  autoriaPropia?: number | null;
  prioridad?: boolean;
  active?: boolean;
};

export async function updateUnit(id: string, patch: UnitPatch, actorEmail: string): Promise<SeguimientoUnit | null> {
  await ensureSeguimientoSchema();
  const cur = await getUnit(id);
  if (!cur) return null;
  const next = {
    name: patch.name ?? cur.name,
    sello: patch.sello !== undefined ? patch.sello : cur.sello,
    aliases: patch.aliases ?? cur.aliases,
    photoUrl: patch.photoUrl !== undefined ? patch.photoUrl : cur.photoUrl,
    info: patch.info !== undefined ? patch.info : cur.info,
    autoriaPropia: patch.autoriaPropia !== undefined ? patch.autoriaPropia : cur.autoriaPropia,
    prioridad: patch.prioridad ?? cur.prioridad,
    active: patch.active ?? cur.active,
  };
  const { rows } = await sql`
    UPDATE seguimiento_units SET
      name = ${next.name},
      sello = ${next.sello},
      aliases = ${JSON.stringify(next.aliases)}::jsonb,
      photo_url = ${next.photoUrl},
      info = ${next.info},
      autoria_propia = ${next.autoriaPropia},
      prioridad = ${next.prioridad},
      active = ${next.active},
      updated_by = ${actorEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToUnit(rows[0]) : null;
}

export type SeguimientoReview = {
  id: number;
  unitId: string;
  estado: EstadoSeguimiento;
  foco: string | null;
  proximoPaso: string | null;
  nota: string | null;
  createdAt: string;
  createdBy: string | null;
};

// Una revisión = foto del momento. Actualiza el estado "actual" de la
// unidad (lo que muestra la tarjeta) y deja el registro en el historial,
// así se puede ver cómo evolucionó semana a semana.
export async function addReview(
  id: string,
  input: { estado: EstadoSeguimiento; foco: string | null; proximoPaso: string | null; nota: string | null },
  actorEmail: string
): Promise<SeguimientoUnit | null> {
  await ensureSeguimientoSchema();
  await sql`
    INSERT INTO seguimiento_reviews (unit_id, estado, foco, proximo_paso, nota, created_by)
    VALUES (${id}, ${input.estado}, ${input.foco}, ${input.proximoPaso}, ${input.nota}, ${actorEmail})
  `;
  const { rows } = await sql`
    UPDATE seguimiento_units SET
      estado = ${input.estado},
      foco = ${input.foco},
      proximo_paso = ${input.proximoPaso},
      last_review_at = now(),
      last_review_by = ${actorEmail}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToUnit(rows[0]) : null;
}

export async function listReviews(id: string, limit = 30): Promise<SeguimientoReview[]> {
  await ensureSeguimientoSchema();
  const { rows } = await sql`
    SELECT * FROM seguimiento_reviews WHERE unit_id = ${id} ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    unitId: r.unit_id as string,
    estado: r.estado as EstadoSeguimiento,
    foco: (r.foco as string | null) ?? null,
    proximoPaso: (r.proximo_paso as string | null) ?? null,
    nota: (r.nota as string | null) ?? null,
    createdAt: toIso(r.created_at) ?? "",
    createdBy: (r.created_by as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Métricas automáticas
// ---------------------------------------------------------------------------

export type ShowLite = { fecha: string; venue: string | null; ciudad: string | null; estado: string };
export type ReleaseLite = { titulo: string; fecha: string; estado?: string };

export type UnitMetrics = {
  // Shows (agenda de Booking)
  showsNext7: number;
  showsNext30: number;
  showsThisMonth: number;
  showsLast30: number;
  showsPerMonth: number; // promedio de los últimos 90 días
  nextShow: ShowLite | null;
  upcomingShows: ShowLite[];
  // Música (catálogo + lanzamientos PM)
  releasesLast30: number;
  releasesLast90: number;
  releasesPerMonth: number; // promedio de los últimos 180 días
  lastRelease: ReleaseLite | null;
  nextRelease: ReleaseLite | null;
  recentReleases: ReleaseLite[];
  // Audiencia (Chartmetric)
  monthlyListeners: number | null;
  listenersDelta7: number | null;
  // Para sellos / subsellos
  artistCount: number | null;
};

export type SeguimientoOverviewItem = SeguimientoUnit & { autoPhotoUrl: string | null; metrics: UnitMetrics };

// "G-Sony" / "G Sony" / "GSony", "Lazer K" / "LazerK" — mismo artista.
function key(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function dateKey(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "").slice(0, 10);
}

function addDays(base: string, days: number): string {
  const d = new Date(base + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

type ShowRow = { artist: string; fecha: string; venue: string | null; ciudad: string | null; estado: string };
type TrackRow = {
  track: string;
  fecha: string;
  participants: string[];
  sello: string | null;
  streamingProject: string | null;
  producer: string | null;
};

// Cada fuente va envuelta: si una tabla todavía no existe en este entorno
// (o falla Chartmetric), la página igual carga con lo que haya.
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[seguimiento]", e);
    return fallback;
  }
}

async function loadShows(from: string, to: string): Promise<ShowRow[]> {
  await ensureBookingSchema();
  const { rows } = await sql`
    SELECT artist_name, fecha, venue, ciudad, estado
    FROM booking_shows
    WHERE archived_at IS NULL AND fecha >= ${from}::date AND fecha <= ${to}::date
    ORDER BY fecha ASC
  `;
  return rows.map((r) => ({
    artist: r.artist_name as string,
    fecha: dateKey(r.fecha),
    venue: (r.venue as string | null) ?? null,
    ciudad: (r.ciudad as string | null) ?? null,
    estado: r.estado as string,
  }));
}

async function loadTracks(from: string): Promise<TrackRow[]> {
  await ensureCatalogSchema();
  const { rows } = await sql`
    SELECT track, release_date, participants, artist_display, sello, streaming_project, producer
    FROM catalog_tracks
    WHERE release_date >= ${from}
    ORDER BY release_date DESC
  `;
  return rows.map((r) => {
    const participants = (r.participants as string[] | null) ?? [];
    return {
      track: r.track as string,
      fecha: dateKey(r.release_date),
      participants: participants.length ? participants : [r.artist_display as string],
      sello: (r.sello as string | null) ?? null,
      streamingProject: (r.streaming_project as string | null) ?? null,
      producer: (r.producer as string | null) ?? null,
    };
  });
}

function emptyMetrics(): UnitMetrics {
  return {
    showsNext7: 0,
    showsNext30: 0,
    showsThisMonth: 0,
    showsLast30: 0,
    showsPerMonth: 0,
    nextShow: null,
    upcomingShows: [],
    releasesLast30: 0,
    releasesLast90: 0,
    releasesPerMonth: 0,
    lastRelease: null,
    nextRelease: null,
    recentReleases: [],
    monthlyListeners: null,
    listenersDelta7: null,
    artistCount: null,
  };
}

export async function getSeguimientoOverview(): Promise<{ items: SeguimientoOverviewItem[]; generatedAt: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const d7 = addDays(today, 7);
  const d30 = addDays(today, 30);
  const m30 = addDays(today, -30);
  const m90 = addDays(today, -90);
  const m180 = addDays(today, -180);
  const nextMonthStart = (() => {
    const d = new Date(monthStart + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [units, shows, tracks, upcoming, ranking, artists] = await Promise.all([
    listUnits(),
    safe(loadShows(m90, addDays(today, 120)), [] as ShowRow[]),
    safe(loadTracks(m180), [] as TrackRow[]),
    safe(getManagementReleaseEvents(), []),
    safe(getRankingLatest(), []),
    safe(listAllArtists(), []),
  ]);

  const rankingByKey = new Map(ranking.map((r) => [key(r.artist_name), r]));
  const artistPhotoByKey = new Map<string, string>();
  for (const a of artists) if (a.photoUrl) artistPhotoByKey.set(key(a.name), a.photoUrl);

  const artistCountBySello = new Map<string, number>();
  for (const u of units) {
    if (u.tipo === "artista" && u.sello) artistCountBySello.set(u.sello, (artistCountBySello.get(u.sello) ?? 0) + 1);
  }

  const items: SeguimientoOverviewItem[] = units.map((u) => {
    const keys = new Set([u.name, ...u.aliases].map(key).filter(Boolean));
    const m = emptyMetrics();

    // --- Shows: artistas, streamings y fiestas pueden tener fechas en la agenda.
    if (u.tipo === "artista" || u.tipo === "streaming" || u.tipo === "fiesta") {
      const mine = shows.filter((s) => keys.has(key(s.artist)));
      const future = mine.filter((s) => s.fecha >= today);
      m.showsNext7 = future.filter((s) => s.fecha < d7).length;
      m.showsNext30 = future.filter((s) => s.fecha < d30).length;
      m.showsThisMonth = mine.filter((s) => s.fecha >= monthStart && s.fecha < nextMonthStart).length;
      m.showsLast30 = mine.filter((s) => s.fecha < today && s.fecha >= m30).length;
      m.showsPerMonth = round1(mine.filter((s) => s.fecha < today && s.fecha >= m90).length / 3);
      m.upcomingShows = future.slice(0, 6).map(({ fecha, venue, ciudad, estado }) => ({ fecha, venue, ciudad, estado }));
      m.nextShow = m.upcomingShows[0] ?? null;
    }

    // --- Música publicada.
    let mineTracks: TrackRow[] = [];
    if (u.tipo === "artista") {
      mineTracks = tracks.filter((t) => t.participants.some((p) => keys.has(key(p))));
    } else if (u.tipo === "streaming") {
      mineTracks = tracks.filter(
        (t) => (t.streamingProject && keys.has(key(t.streamingProject))) || t.participants.some((p) => keys.has(key(p)))
      );
    } else if (u.tipo === "sello" || u.tipo === "subsello") {
      const selloKey = key(u.sello ?? u.name);
      mineTracks = tracks.filter((t) => t.sello && key(t.sello) === selloKey);
      m.artistCount = artistCountBySello.get(u.sello ?? u.name) ?? 0;
    } else if (u.tipo === "productor") {
      mineTracks = tracks.filter((t) => t.producer && keys.has(key(t.producer)));
    } else if (u.tipo === "distribucion") {
      mineTracks = tracks;
    }
    // Un EP/álbum son varias filas con la misma fecha: cuentan como canciones,
    // que es lo que se quiere medir ("cuántas canciones saca por mes").
    const seen = new Set<string>();
    const dedup = mineTracks.filter((t) => {
      const k = `${key(t.track)}|${t.fecha}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const published = dedup.filter((t) => t.fecha && t.fecha <= today);
    m.releasesLast30 = published.filter((t) => t.fecha >= m30).length;
    m.releasesLast90 = published.filter((t) => t.fecha >= m90).length;
    m.releasesPerMonth = round1(published.length / 6);
    m.recentReleases = published.slice(0, 6).map((t) => ({ titulo: t.track, fecha: t.fecha }));
    m.lastRelease = m.recentReleases[0] ?? null;

    // --- Próximo lanzamiento (PM + catálogo + planilla).
    if (u.tipo === "artista" || u.tipo === "streaming") {
      const next = upcoming
        .filter((r) => r.fecha_lanzamiento >= today)
        .filter(
          (r) =>
            keys.has(key(r.artist_name)) ||
            (r.colaboradores ?? "").split(/[,&]/).some((c) => keys.has(key(c)))
        )
        .sort((a, b) => a.fecha_lanzamiento.localeCompare(b.fecha_lanzamiento))[0];
      if (next) m.nextRelease = { titulo: next.group_nombre ?? next.fonograma_nombre, fecha: next.fecha_lanzamiento, estado: next.estado };
    } else if (u.tipo === "sello" || u.tipo === "subsello") {
      const selloKey = key(u.sello ?? u.name);
      const next = upcoming
        .filter((r) => r.fecha_lanzamiento >= today && r.sello && key(r.sello) === selloKey)
        .sort((a, b) => a.fecha_lanzamiento.localeCompare(b.fecha_lanzamiento))[0];
      if (next) m.nextRelease = { titulo: `${next.artist_name} — ${next.group_nombre ?? next.fonograma_nombre}`, fecha: next.fecha_lanzamiento, estado: next.estado };
    }

    // --- Oyentes mensuales.
    let autoPhotoUrl: string | null = null;
    for (const k of keys) {
      const r = rankingByKey.get(k);
      if (r) {
        m.monthlyListeners = r.monthly_listeners;
        m.listenersDelta7 = r.monthly_listeners != null && r.prev_7d != null ? r.monthly_listeners - r.prev_7d : null;
        autoPhotoUrl = r.image_url;
        break;
      }
    }
    for (const k of keys) {
      const p = artistPhotoByKey.get(k);
      if (p) {
        autoPhotoUrl = p;
        break;
      }
    }

    return { ...u, autoPhotoUrl, metrics: m };
  });

  return { items, generatedAt: new Date().toISOString() };
}
