import catalogo from "@/data/catalogo.json";

type ArtistEntry = {
  artist: string;
  track_count: number;
  companies: string[];
};

const data = catalogo as ArtistEntry[];

const TOP_N = 10;

export default function ArtistRanking() {
  const ranked = [...data]
    .filter((a) => a.artist && a.artist !== "Sin artista")
    .sort((a, b) => b.track_count - a.track_count)
    .slice(0, TOP_N);

  const maxCount = ranked[0]?.track_count ?? 1;

  return (
    <div className="border rounded-lg p-5 mb-8">
      <h2 className="text-base font-semibold mb-1">Ranking de artistas</h2>
      <p className="text-xs text-gray-500 mb-4">
        Top {TOP_N} por cantidad de tracks en el catálogo
      </p>

      <div className="flex flex-col gap-2">
        {ranked.map((a, i) => (
          <div key={a.artist} className="flex items-center gap-3 text-sm">
            <span className="w-5 text-right text-gray-400 tabular-nums">
              {i + 1}
            </span>
            <span className="w-40 shrink-0 truncate font-medium" title={a.artist}>
              {a.artist}
            </span>
            <div className="flex-1 bg-gray-100 rounded h-5 relative overflow-hidden">
              <div
                className="bg-black h-5 rounded"
                style={{ width: `${(a.track_count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right tabular-nums text-gray-600">
              {a.track_count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
