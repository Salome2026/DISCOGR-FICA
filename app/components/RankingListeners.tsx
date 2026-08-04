"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RankingRow = {
  artist_id: string;
  artist_name: string;
  sello: string | null;
  monthly_listeners: number | null;
  followers: number | null;
  monthly_listeners_rank: number | null;
  artist_rank: number | null;
  image_url: string | null;
  measured_at: string;
  prev_day: number | null;
  prev_7d: number | null;
  prev_30d: number | null;
};

function delta(current: number | null, prev: number | null) {
  if (current == null || prev == null) return null;
  const diff = current - prev;
  const pct = prev !== 0 ? (diff / prev) * 100 : 0;
  return { diff, pct };
}

function DeltaTag({ current, prev, label }: { current: number | null; prev: number | null; label: string }) {
  const d = delta(current, prev);
  if (!d) return <span className="rk-delta rk-delta-none">{label} —</span>;
  const positive = d.diff >= 0;
  return (
    <span className={`rk-delta ${positive ? "rk-delta-up" : "rk-delta-down"}`}>
      {label} {positive ? "+" : ""}
      {d.diff.toLocaleString("es-AR")} ({positive ? "+" : ""}
      {d.pct.toFixed(1)}%)
    </span>
  );
}

function Avatar({ r, size, radius, fontSize }: { r: RankingRow; size: number; radius: number; fontSize: number }) {
  if (r.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={r.image_url}
        alt={r.artist_name}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "var(--accent-gradient)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        color: "var(--accent-ink)",
        flexShrink: 0,
      }}
    >
      {r.artist_name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function RankingListeners() {
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<{ finished_at?: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.ranking ?? []);
        setLastRun(d.lastRun ?? null);
        if (d.error) setError(d.error);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const top3 = (rows ?? []).slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // visual order: 2nd, 1st, 3rd
  const listRows = expanded ? rows ?? [] : (rows ?? []).slice(0, 10);

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <style>{`
        .rk-split{display:flex;gap:20px;margin-top:1.1rem;align-items:stretch;}
        .rk-podium{flex:1;min-width:0;display:flex;align-items:flex-end;justify-content:center;gap:22px;}
        .rk-podium-item{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:5px;text-decoration:none;color:inherit;text-align:center;transition:transform var(--dur-fast) var(--ease-out);}
        .rk-podium-item:hover{transform:translateY(-3px);}
        .rk-podium-item.first{flex:1.2;}
        .rk-podium-name{font-size:11.5px;font-weight:700;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;}
        .rk-podium-item.first .rk-podium-name{font-size:13px;}
        .rk-podium-listeners{font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent-color);}
        .rk-podium-item.first .rk-podium-listeners{font-size:17px;}
        .rk-podium-bar{width:100%;border-radius:9px 9px 3px 3px;display:flex;align-items:flex-start;justify-content:center;padding-top:8px;margin-top:6px;}
        .rk-podium-num{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;}
        .rk-podium-bar.rank-1{height:120px;background:var(--accent-gradient);box-shadow:0 0 24px -8px var(--accent-color-glow);}
        .rk-podium-bar.rank-1 .rk-podium-num{color:var(--accent-ink);}
        .rk-podium-bar.rank-2{height:82px;background:var(--glass-bg-strong);border:1px solid var(--glass-border);}
        .rk-podium-bar.rank-2 .rk-podium-num{color:var(--text-1);}
        .rk-podium-bar.rank-3{height:58px;background:var(--glass-bg);border:1px solid var(--glass-border);}
        .rk-podium-bar.rank-3 .rk-podium-num{color:var(--text-2);}
        .rk-list{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto;}
        .rk-list-row{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:9px;text-decoration:none;color:inherit;transition:background var(--dur-fast) var(--ease-out);}
        .rk-list-row:hover{background:var(--bg-2);}
        .rk-list-rank{width:20px;font-size:11.5px;color:var(--text-3);font-variant-numeric:tabular-nums;font-weight:600;text-align:center;flex-shrink:0;}
        .rk-list-info{flex:1;min-width:0;}
        .rk-list-name{font-size:12.5px;font-weight:600;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .rk-list-sello{font-size:10px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .rk-list-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;}
        .rk-list-listeners{font-size:13px;font-weight:700;color:var(--accent-color);font-variant-numeric:tabular-nums;}
        .rk-deltas{display:flex;gap:6px;font-size:9px;flex-wrap:wrap;justify-content:flex-end;}
        .rk-delta-up{color:var(--good);}
        .rk-delta-down{color:var(--crit);}
        .rk-delta-none{color:var(--text-3);}
        .rk-toggle{margin-top:12px;background:transparent;border:1px solid var(--line-soft);border-radius:100px;padding:6px 14px;font-size:11.5px;color:var(--text-2);cursor:pointer;transition:background var(--dur-fast) var(--ease-out);}
        .rk-toggle:hover{background:var(--bg-2);}
        .rk-pending{font-size:12px;color:var(--text-3);padding:1rem 0;line-height:1.6;}
        @media (max-width:640px){ .rk-split{flex-direction:column;} .rk-podium{flex:0 0 auto;} }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="card-label">Ranking de artistas</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>Oyentes mensuales</div>
        </div>
        {lastRun?.finished_at && (
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            Actualizado: {new Date(lastRun.finished_at).toLocaleString("es-AR")}
          </span>
        )}
      </div>

      {(!rows || rows.length === 0) && (
        <div className="rk-pending">
          {error ? (
            <>Sin conexión a la base histórica todavía ({error}).</>
          ) : (
            <>
              Esperando la conexión con Chartmetric (acceso a la API en revisión) y la base de
              datos histórica. Este módulo va a mostrar el ranking real de oyentes mensuales apenas
              esté disponible — no se muestran números simulados.
            </>
          )}
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="rk-split">
            {top3.length > 0 && (
              <div className="rk-podium">
                {podiumOrder.map((r, idx) => {
                  if (!r) return <div key={`empty-${idx}`} className="rk-podium-item" />;
                  const rank = top3.indexOf(r) + 1;
                  return (
                    <Link
                      href={`/artistas/${encodeURIComponent(r.artist_name)}`}
                      className={`rk-podium-item ${rank === 1 ? "first" : ""}`}
                      key={r.artist_id}
                    >
                      <Avatar r={r} size={rank === 1 ? 52 : 40} radius={rank === 1 ? 15 : 12} fontSize={rank === 1 ? 15 : 12.5} />
                      <div className="rk-podium-name">{r.artist_name}</div>
                      <div className="rk-podium-listeners">{r.monthly_listeners?.toLocaleString("es-AR") ?? "—"}</div>
                      <div className={`rk-podium-bar rank-${rank}`}>
                        <span className="rk-podium-num">{rank}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="rk-list">
              {listRows.map((r, i) => (
                <Link
                  href={`/artistas/${encodeURIComponent(r.artist_name)}`}
                  className="rk-list-row"
                  key={r.artist_id}
                >
                  <span className="rk-list-rank">#{i + 1}</span>
                  <Avatar r={r} size={30} radius={9} fontSize={11} />
                  <div className="rk-list-info">
                    <div className="rk-list-name">{r.artist_name}</div>
                    <div className="rk-list-sello">{r.sello ?? "Sin sello asignado"}</div>
                  </div>
                  <div className="rk-list-right">
                    <div className="rk-list-listeners">{r.monthly_listeners?.toLocaleString("es-AR") ?? "—"}</div>
                    <div className="rk-deltas">
                      <DeltaTag current={r.monthly_listeners} prev={r.prev_7d} label="7d" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {rows.length > 10 && (
            <button className="rk-toggle" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Mostrar solo Top 10" : `Ver ranking completo (${rows.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
