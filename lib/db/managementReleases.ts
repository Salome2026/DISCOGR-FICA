import { sql } from "@vercel/postgres";

// Same shape the shared ReleaseCalendar/UpcomingReleasesList already expect
// from /api/pm/releases, so Management's version is a drop-in data source.
export type ManagementReleaseRow = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  estado: string;
  distribuidora: string | null;
  fecha_lanzamiento: string;
  hora_lanzamiento: string | null;
  colaboradores: string | null;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
  marketing_plan: boolean;
  marketing_plan_detalle: string | null;
  portada_url: string | null;
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// pm_releases.fecha_lanzamiento comes back from @vercel/postgres as a Date
// object (not a string) until it's JSON-serialized by the route handler —
// String(dateObject).slice(0,10) silently produces garbage ("Thu Aug 06"
// instead of "2026-08-06"), which broke the dedup key below. catalog_tracks
// .release_date is already plain TEXT, so this only needs to handle both.
function toDateKey(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// Most new releases today arrive through the recurring "ogs" catalog import,
// not through a PM manually creating a pm_releases row — until that changes,
// Management needs to see both. Rows with a "pm-" id are already mirrored
// FROM pm_releases (see upsertTrackFromRelease in app/api/pm/releases/route.ts)
// so they're skipped here to avoid double-counting; anything else that shares
// an artist/track/date with a real pm_releases row is deduped too, in case a
// PM later formalizes a catalog-sourced release by hand.
export async function getManagementReleaseEvents(): Promise<ManagementReleaseRow[]> {
  const { rows: pmRows } = await sql`
    SELECT r.id, r.artist_name, r.sello, r.fonograma_nombre, r.estado, r.distribuidora,
      r.fecha_lanzamiento, r.hora_lanzamiento, r.colaboradores, r.group_id,
      g.tipo AS group_tipo, g.nombre AS group_nombre, r.marketing_plan, r.marketing_plan_detalle,
      r.portada_url
    FROM pm_releases r
    LEFT JOIN pm_release_groups g ON g.id = r.group_id
    WHERE r.archived = false
  `;

  const { rows: catalogRows } = await sql`
    SELECT id, artist_display, participants, track, release_date, company, sello
    FROM catalog_tracks
    WHERE release_date >= CURRENT_DATE::text AND id NOT LIKE 'pm-%'
    ORDER BY release_date ASC
  `;

  const pmKeys = new Set(
    pmRows.map(
      (r) =>
        `${normalize(r.artist_name as string)}|${normalize(r.fonograma_nombre as string)}|${toDateKey(r.fecha_lanzamiento)}`
    )
  );

  const catalogEvents: ManagementReleaseRow[] = [];
  let syntheticId = 900000;
  for (const c of catalogRows) {
    const participants = c.participants as string[];
    const [main, ...rest] = participants.length ? participants : [c.artist_display as string];
    const releaseDate = toDateKey(c.release_date);
    const key = `${normalize(main)}|${normalize(c.track as string)}|${releaseDate}`;
    if (pmKeys.has(key)) continue;
    catalogEvents.push({
      id: syntheticId++,
      artist_name: main,
      sello: c.sello as string | null,
      fonograma_nombre: c.track as string,
      estado: "Catálogo",
      distribuidora: c.company as string | null,
      fecha_lanzamiento: releaseDate,
      hora_lanzamiento: null,
      colaboradores: rest.length ? rest.join(", ") : null,
      group_id: null,
      group_tipo: null,
      group_nombre: null,
      marketing_plan: false,
      marketing_plan_detalle: null,
      portada_url: null,
    });
  }

  const pmEvents: ManagementReleaseRow[] = pmRows.map((r) => ({
    id: r.id as number,
    artist_name: r.artist_name as string,
    sello: r.sello as string | null,
    fonograma_nombre: r.fonograma_nombre as string,
    estado: r.estado as string,
    distribuidora: r.distribuidora as string | null,
    fecha_lanzamiento: toDateKey(r.fecha_lanzamiento),
    hora_lanzamiento: r.hora_lanzamiento as string | null,
    colaboradores: r.colaboradores as string | null,
    group_id: r.group_id as number | null,
    group_tipo: r.group_tipo as string | null,
    group_nombre: r.group_nombre as string | null,
    marketing_plan: r.marketing_plan as boolean,
    marketing_plan_detalle: r.marketing_plan_detalle as string | null,
    portada_url: r.portada_url as string | null,
  }));

  return [...pmEvents, ...catalogEvents];
}
