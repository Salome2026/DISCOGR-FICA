"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RankingRow = {
  artist_id: string;
  artist_name: string;
  sello: string | null;
  monthly_listeners: number | null;
  followers: number | null;
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

  const visible = expanded ? rows ?? [] : (rows ?? []).slice(0, 5);
  const maxListeners = Math.max(1, ...(rows ?? []).map((r) => r.monthly_listeners ?? 0));

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <style>{`
        .rk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:1.25rem;}
        .rk-card{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:var(--radius-md);border:1px solid var(--glass-border);background:var(--glass-bg);text-decoration:none;color:inherit;transition:transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);}
        .rk-card:hover{transform:translateY(-3px);background:var(--glass-bg-strong);border-color:var(--line);}
        .rk-card-top{display:flex;align-items:center;justify-content:space-between;}
        .rk-avatar{width:38px;height:38px;border-radius:11px;background:var(--accent-gradient);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--accent-ink);}
        .rk-rank{font-size:11px;color:var(--text-3);font-variant-numeric:tabular-nums;font-weight:600;}
        .rk-name{font-size:14px;font-weight:600;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .rk-sello-chip{align-self:flex-start;font-size:10.5px;color:var(--text-3);border:1px solid var(--line-soft);border-radius:100px;padding:2px 9px;}
        .rk-listeners{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
        .rk-bar-track{height:4px;background:var(--bg-2);border-radius:4px;overflow:hidden;}
        .rk-bar-fill{height:100%;background:var(--accent-gradient);border-radius:4px;transition:width var(--dur-slow) var(--ease-out);}
        .rk-deltas{display:flex;gap:8px;font-size:11px;flex-wrap:wrap;}
        .rk-delta-up{color:var(--good);}
        .rk-delta-down{color:var(--crit);}
        .rk-delta-none{color:var(--text-3);}
        .rk-toggle{margin-top:14px;background:transparent;border:1px solid var(--line-soft);border-radius:100px;padding:7px 16px;font-size:12.5px;color:var(--text-2);cursor:pointer;transition:background var(--dur-fast) var(--ease-out);}
        .rk-toggle:hover{background:var(--bg-2);}
        .rk-pending{font-size:13px;color:var(--text-3);padding:1rem 0;line-height:1.6;}
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
          <div className="rk-grid">
            {visible.map((r, i) => (
              <Link
                href={`/artistas/${encodeURIComponent(r.artist_name)}`}
                className="rk-card"
                key={r.artist_id}
              >
                <div className="rk-card-top">
                  <div className="rk-avatar">{r.artist_name.slice(0, 2).toUpperCase()}</div>
                  <span className="rk-rank">#{i + 1}</span>
                </div>
                <div>
                  <div className="rk-name">{r.artist_name}</div>
                  <div className="rk-sello-chip">{r.sello ?? "Sin sello asignado"}</div>
                </div>
                <div className="rk-listeners">{r.monthly_listeners?.toLocaleString("es-AR") ?? "—"}</div>
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
          {rows.length > 5 && (
            <button className="rk-toggle" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Mostrar solo Top 5" : `Ver ranking completo (${rows.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
