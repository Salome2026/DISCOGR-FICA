import { listAllArtists, type Artist } from "./artists";
import { getRankingLatest } from "./listeners";
import { getNextReleasePerArtist } from "./releases";
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
  const [artists, ranking, nextReleases, contracts] = await Promise.all([
    listAllArtists(),
    getRankingLatest(),
    getNextReleasePerArtist(),
    listContracts(),
  ]);

  const listenersByName = new Map<string, number | null>();
  const imageByName = new Map<string, string | null>();
  for (const r of ranking) {
    const key = normalize(r.artist_name);
    listenersByName.set(key, r.monthly_listeners);
    imageByName.set(key, r.image_url);
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

  // An artist whose contract with the label ended shouldn't show up as part
  // of the active roster, even though their past catalog stays intact
  // everywhere else in the app.
  const rescindedNames = new Set(
    contracts.filter((c) => c.estado === "Rescindido").map((c) => normalize(c.artist))
  );

  const rows: ManagementArtistRow[] = artists
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
