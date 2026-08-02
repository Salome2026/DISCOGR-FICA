import catalogo from "@/data/catalogo.json";
import DistribucionChart from "./DistribucionChart";
import EstadoDonut from "./EstadoDonut";
import CompanyList from "./CompanyList";
import SellosGrid from "./SellosGrid";
import ArtistRanking from "./ArtistRanking";
import RegaliasCalc from "./RegaliasCalc";
import IngresosEstimados from "./IngresosEstimados";

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

      <SellosGrid />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DistribucionChart />
        <EstadoDonut />
      </div>

      <ArtistRanking />

      <RegaliasCalc />

      <IngresosEstimados />

      <h2 className="text-base font-semibold mb-3">Tracks por compañía</h2>
      <CompanyList />
    </main>
  );
}
