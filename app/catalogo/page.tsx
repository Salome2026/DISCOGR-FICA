import catalogo from "@/data/catalogo.json";
import DistribucionChart from "./DistribucionChart";

type Track = {
  track: string;
  isrc: string;
  album: string;
  company: string;
  release_date: string;
  upc: string;
};

type ArtistEntry = {
  artist: string;
  track_count: number;
  companies: string[];
  tracks: Track[];
};

const data = catalogo as ArtistEntry[];

export default function Catalogo() {
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
      <h1 className="text-2xl font-semibold mb-1">Catálogo</h1>
      <p className="text-sm text-gray-500 mb-8">
        {data.length} artistas · {data.reduce((a, e) => a + e.track_count, 0)} tracks
        (importado desde Drive)
      </p>

      <DistribucionChart />

      <div className="flex flex-col gap-3">
        {data.map((entry) => (
          <details
            key={entry.artist}
            className="border rounded-lg px-4 py-3 group"
          >
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium">{entry.artist}</span>
              <span className="text-xs text-gray-500 flex gap-2 items-center">
                {entry.companies.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-gray-100 px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
                <span>{entry.track_count} tracks</span>
              </span>
            </summary>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="pr-4 py-1 font-normal">Track</th>
                    <th className="pr-4 py-1 font-normal">Álbum</th>
                    <th className="pr-4 py-1 font-normal">ISRC</th>
                    <th className="pr-4 py-1 font-normal">Compañía</th>
                    <th className="pr-4 py-1 font-normal">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entry.tracks.map((t, i) => (
                    <tr key={i}>
                      <td className="pr-4 py-1">{t.track}</td>
                      <td className="pr-4 py-1">{t.album || "—"}</td>
                      <td className="pr-4 py-1 font-mono text-xs">
                        {t.isrc || "—"}
                      </td>
                      <td className="pr-4 py-1">{t.company || "—"}</td>
                      <td className="pr-4 py-1">{t.release_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
