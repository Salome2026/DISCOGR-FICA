import { listAllArtists, slugify, type Artist } from "./artists";
import { getRankingLatest } from "./listeners";
import { getManagementReleaseEvents } from "./managementReleases";
import { listContracts } from "./legalContracts";

// No shared foreign key connects artists, artist_listeners_daily
// (Chartmetric snapshots) and pm_releases — every existing cross-table
// lookup in this codebase joins by normalized name, not a SQL join.
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export type ManagementArtistRow = {
  id: string;
  name: string;
  sello: string | null;
  photoUrl: string | null;
  chartPosition: number | null;
  estadoGeneral: string | null;
  genero: string | null;
  monthlyListeners: number | null;
  nextRelease: {
    titulo: string;
    fecha: string;
    hora: string | null;
    estado: string;
  } | null;
};

// Fixed order: chartPosition ASC (nulls last — "not yet placed"). Within
// that "not yet placed" group, default to monthly listeners DESC rather than
// alphabetical — a meaningful starting order for the ~50 artists nobody has
// manually ranked yet. A manually set chartPosition still always wins and is
// never recomputed live — that's the whole point of a curated chart position.
export async function getManagementArtistOverview(): Promise<ManagementArtistRow[]> {
  const [artists, ranking, releaseEvents, contracts] = await Promise.all([
    listAllArtists(),
    getRankingLatest(),
    getManagementReleaseEvents(),
    listContracts(),
  ]);

  const listenersByName = new Map<string, number | null>();
  const imageByName = new Map<string, string | null>();
  for (const r of ranking) {
    const key = normalize(r.artist_name);
    listenersByName.set(key, r.monthly_listeners);
    imageByName.set(key, r.image_url);
  }

  // Soonest upcoming (today or later) event per artist — the merged event
  // list also carries past pm_releases rows (the calendar needs those), so
  // this filters and picks the earliest itself rather than trusting order.
  const today = new Date().toISOString().slice(0, 10);
  const nextReleaseByName = new Map<string, ManagementArtistRow["nextRelease"]>();
  for (const r of releaseEvents) {
    if (r.fecha_lanzamiento < today) continue;
    const key = normalize(r.artist_name);
    const existing = nextReleaseByName.get(key);
    if (existing && existing.fecha <= r.fecha_lanzamiento) continue;
    nextReleaseByName.set(key, {
      titulo: r.group_nombre ?? r.fonograma_nombre,
      fecha: r.fecha_lanzamiento,
      hora: r.hora_lanzamiento,
      estado: r.estado,
    });
  }

  // "Streamings"-sello artists (e.g. compilation acts like La Juntada De Los
  // Artistas) have no entry in the static roster and no row in the `artists`
  // table, so listAllArtists() never surfaces them at all — pull in any such
  // artist directly from the Chartmetric ranking data instead, so anyone
  // with real Spotify/Chartmetric data shows up regardless of roster source.
  const knownNames = new Set(artists.map((a) => normalize(a.name)));
  const streamingsArtists: Artist[] = [];
  for (const r of ranking) {
    if (r.sello !== "Streamings") continue;
    const key = normalize(r.artist_name);
    if (knownNames.has(key)) continue;
    knownNames.add(key);
    streamingsArtists.push({
      id: slugify(r.artist_name),
      name: r.artist_name,
      aliases: [],
      sello: "Streamings",
      instagram: null,
      tiktok: null,
      youtube: null,
      spotify: null,
      chartmetricId: null,
      photoUrl: r.image_url,
      chartPosition: null,
      estadoGeneral: null,
      genero: null,
      updatedAt: null,
    });
  }
  const allArtists = [...artists, ...streamingsArtists];

  // An artist whose contract with the label ended shouldn't show up as part
  // of the active roster, even though their past catalog stays intact
  // everywhere else in the app.
  const rescindedNames = new Set(
    contracts.filter((c) => c.estado === "Rescindido").map((c) => normalize(c.artist))
  );

  const rows: ManagementArtistRow[] = allArtists
    .filter((a) => !rescindedNames.has(normalize(a.name)))
    .map((a: Artist) => {
      const key = normalize(a.name);
      return {
        id: a.id,
        name: a.name,
        sello: a.sello,
        photoUrl: a.photoUrl ?? imageByName.get(key) ?? null,
        chartPosition: a.chartPosition,
        estadoGeneral: a.estadoGeneral,
        genero: a.genero,
        monthlyListeners: listenersByName.get(key) ?? null,
        nextRelease: nextReleaseByName.get(key) ?? null,
      };
    });

  rows.sort((x, y) => {
    if (x.chartPosition == null && y.chartPosition == null) {
      return (y.monthlyListeners ?? -1) - (x.monthlyListeners ?? -1);
    }
    if (x.chartPosition == null) return 1;
    if (y.chartPosition == null) return -1;
    return x.chartPosition - y.chartPosition;
  });

  return rows;
}
