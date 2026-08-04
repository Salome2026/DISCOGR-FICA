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
  const rest = (rows ?? []).slice(3, 13);
  const visible = expanded ? (rows ?? []).slice(3) : rest;
  const maxListeners = Math.max(1, ...(rows ?? []).map((r) => r.monthly_listeners ?? 0));
  const podiumOrder = [top3[1], top3[0], top3[2]]; // visual order: 2nd, 1st, 3rd

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <style>{`
        .rk-podium{display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-top:1.1rem;margin-bottom:1.25rem;}
        .rk-podium-item{display:flex;flex-direction:column;align-items:center;gap:5px;text-decoration:none;color:inherit;text-align:center;width:104px;transition:transform var(--dur-fast) var(--ease-out);}
        .rk-podium-item:hover{transform:translateY(-3px);}
        .rk-podium-item.first{width:116px;}
        .rk-podium-avatar{width:40px;height:40px;border-radius:12px;background:var(--accent-gradient);display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:var(--accent-ink);}
        .rk-podium-item.first .rk-podium-avatar{width:52px;height:52px;font-size:15px;}
        .rk-podium-name{font-size:12px;font-weight:700;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;}
        .rk-podium-item.first .rk-podium-name{font-size:14px;}
        .rk-podium-sello{font-size:9.5px;color:var(--text-3);}
        .rk-podium-listeners{font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent-color);}
        .rk-podium-item.first .rk-podium-listeners{font-size:18px;}
        .rk-podium-bar{width:100%;border-radius:9px 9px 3px 3px;display:flex;align-items:flex-start;justify-content:center;padding-top:8px;margin-top:6px;}
        .rk-podium-num{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;}
        .rk-podium-bar.rank-1{height:86px;background:var(--accent-gradient);box-shadow:0 0 24px -8px var(--accent-color-glow);}
        .rk-podium-bar.rank-1 .rk-podium-num{color:var(--accent-ink);}
        .rk-podium-bar.rank-2{height:58px;background:var(--glass-bg-strong);border:1px solid var(--glass-border);}
        .rk-podium-bar.rank-2 .rk-podium-num{color:var(--text-1);}
        .rk-podium-bar.rank-3{height:40px;background:var(--glass-bg);border:1px solid var(--glass-border);}
        .rk-podium-bar.rank-3 .rk-podium-num{color:var(--text-2);}
        .rk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:1rem;}
        .rk-card{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:var(--radius-md);border:1px solid var(--glass-border);background:var(--glass-bg);box-shadow:var(--shadow-glass);text-decoration:none;color:inherit;transition:transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);}
        .rk-card:hover{transform:translateY(-3px);background:var(--glass-bg-strong);border-color:var(--accent-color-glow);box-shadow:0 0 24px -8px var(--accent-color-glow);}
        .rk-card-top{display:flex;align-items:center;justify-content:space-between;}
        .rk-avatar{width:32px;height:32px;border-radius:10px;background:var(--accent-gradient);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:var(--accent-ink);}
        .rk-rank{font-size:10px;color:var(--text-3);font-variant-numeric:tabular-nums;font-weight:600;}
        .rk-name{font-size:12.5px;font-weight:600;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .rk-sello-chip{align-self:flex-start;font-size:9.5px;color:var(--text-3);border:1px solid var(--line-soft);border-radius:100px;padding:2px 8px;}
        .rk-listeners{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
        .rk-bar-track{height:3px;background:var(--bg-2);border-radius:4px;overflow:hidden;}
        .rk-bar-fill{height:100%;background:var(--accent-gradient);border-radius:4px;transition:width var(--dur-slow) var(--ease-out);}
        .rk-deltas{display:flex;gap:7px;font-size:9.5px;flex-wrap:wrap;}
        .rk-delta-up{color:var(--good);}
        .rk-delta-down{color:var(--crit);}
        .rk-delta-none{color:var(--text-3);}
        .rk-toggle{margin-top:12px;background:transparent;border:1px solid var(--line-soft);border-radius:100px;padding:6px 14px;font-size:11.5px;color:var(--text-2);cursor:pointer;transition:background var(--dur-fast) var(--ease-out);}
        .rk-toggle:hover{background:var(--bg-2);}
        .rk-pending{font-size:12px;color:var(--text-3);padding:1rem 0;line-height:1.6;}
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
                    <div className="rk-podium-avatar">{r.artist_name.slice(0, 2).toUpperCase()}</div>
                    <div className="rk-podium-name">{r.artist_name}</div>
                    <div className="rk-podium-sello">{r.sello ?? "Sin sello asignado"}</div>
                    <div className="rk-podium-listeners">{r.monthly_listeners?.toLocaleString("es-AR") ?? "—"}</div>
                    {r.artist_rank != null && (
                      <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>
                        Chartmetric #{r.artist_rank.toLocaleString("es-AR")}
                      </div>
                    )}
                    <div className={`rk-podium-bar rank-${rank}`}>
                      <span className="rk-podium-num">{rank}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="rk-grid">
            {visible.map((r, i) => (
              <Link
                href={`/artistas/${encodeURIComponent(r.artist_name)}`}
                className="rk-card"
                key={r.artist_id}
              >
                <div className="rk-card-top">
                  <div className="rk-avatar">{r.artist_name.slice(0, 2).toUpperCase()}</div>
                  <span className="rk-rank">#{i + 4}</span>
                </div>
                <div>
                  <div className="rk-name">{r.artist_name}</div>
                  <div className="rk-sello-chip">{r.sello ?? "Sin sello asignado"}</div>
                </div>
                <div className="rk-listeners">{r.monthly_listeners?.toLocaleString("es-AR") ?? "—"}</div>
                {r.artist_rank != null && (
                  <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>
                    Chartmetric #{r.artist_rank.toLocaleString("es-AR")} global
                  </div>
                )}
                <div className="rk-bar-track">
                  <div
                    className="rk-bar-fill"
                    style={{ width: `${((r.monthly_listeners ?? 0) / maxListeners) * 100}%` }}
                  />
                </div>
                <div className="rk-deltas">
                  <DeltaTag current={r.monthly_listeners} prev={r.prev_day} label="24h" />
                  <DeltaTag current={r.monthly_listeners} prev={r.prev_7d} label="7d" />
                  <DeltaTag current={r.monthly_listeners} prev={r.prev_30d} label="30d" />
                </div>
              </Link>
            ))}
          </div>
          {rows.length > 13 && (
            <button className="rk-toggle" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Mostrar solo Top 13" : `Ver ranking completo (${rows.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
