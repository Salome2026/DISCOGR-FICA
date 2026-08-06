import { listAllArtists, type Artist } from "./artists";
import { getRankingLatest } from "./listeners";
import { getNextReleasePerArtist } from "./releases";

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
  monthlyListeners: number | null;
  nextRelease: {
    titulo: string;
    fecha: string;
    hora: string | null;
    estado: string;
  } | null;
};

// Fixed order: chartPosition ASC (nulls last — "not yet placed"), then name
// as a stable tiebreak. Never re-sorted by listeners/anything live — that's
// the whole point of a manually curated chart position.
export async function getManagementArtistOverview(): Promise<ManagementArtistRow[]> {
  const [artists, ranking, nextReleases] = await Promise.all([
    listAllArtists(),
    getRankingLatest(),
    getNextReleasePerArtist(),
  ]);

  const listenersByName = new Map<string, number | null>();
  for (const r of ranking) {
    listenersByName.set(normalize(r.artist_name), r.monthly_listeners);
  }

  const nextReleaseByName = new Map<string, ManagementArtistRow["nextRelease"]>();
  for (const r of nextReleases) {
    nextReleaseByName.set(normalize(r.artist_name), {
      titulo: r.group_nombre ?? r.fonograma_nombre,
      fecha: r.fecha_lanzamiento,
      hora: r.hora_lanzamiento,
      estado: r.estado,
    });
  }

  const rows: ManagementArtistRow[] = artists.map((a: Artist) => {
    const key = normalize(a.name);
    return {
      id: a.id,
      name: a.name,
      sello: a.sello,
      photoUrl: a.photoUrl,
      chartPosition: a.chartPosition,
      estadoGeneral: a.estadoGeneral,
      monthlyListeners: listenersByName.get(key) ?? null,
      nextRelease: nextReleaseByName.get(key) ?? null,
    };
  });

  rows.sort((x, y) => {
    if (x.chartPosition == null && y.chartPosition == null) return x.name.localeCompare(y.name, "es");
    if (x.chartPosition == null) return 1;
    if (y.chartPosition == null) return -1;
    return x.chartPosition - y.chartPosition;
  });

  return rows;
}
