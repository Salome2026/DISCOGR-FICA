import data from "@/data/ingresos_estimados.json";

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function IngresosEstimados() {
  return (
    <div className="border rounded-xl p-5 mb-8">
      <h2 className="text-base font-semibold mb-1">Ingresos estimados por streaming</h2>
      <p className="text-xs text-gray-500 mb-1">
        Proyección, no dato real — Spotify no expone reproducciones ni ingresos por su API
        pública. Calculado con una tasa promedio de industria de ${data.rate_per_stream_usd} por
        stream sobre {data.total_tracks.toLocaleString("en-US")} tracks.
      </p>
      <p className="text-xs text-amber-600 mb-4">
        No usar para decisiones financieras — es una estimación ilustrativa.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">Total estimado</div>
          <div className="text-xl font-semibold">{usd(data.total_est_revenue_usd)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">Streams estimados</div>
          <div className="text-xl font-semibold">
            {(data.total_est_streams / 1_000_000).toFixed(1)}M
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">Tracks incluidos</div>
          <div className="text-xl font-semibold">{data.total_tracks.toLocaleString("en-US")}</div>
        </div>
      </div>

      <p className="text-xs font-medium text-gray-500 mb-2">Top artistas por estimado</p>
      <div className="flex flex-col gap-1.5">
        {data.artist_ranking.slice(0, 10).map((a, i) => (
          <div key={a.artist} className="flex items-center gap-3 text-sm">
            <span className="w-5 text-right text-gray-400 tabular-nums">{i + 1}</span>
            <span className="w-40 shrink-0 truncate font-medium" title={a.artist}>
              {a.artist}
            </span>
            <span className="text-xs text-gray-400 tabular-nums">{a.tracks} tracks</span>
            <span className="flex-1 text-right tabular-nums text-gray-700">
              {usd(a.est_revenue_usd)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
