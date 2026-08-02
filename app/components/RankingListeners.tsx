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

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <style>{`
        .rk-row{display:grid;grid-template-columns:28px 1fr auto;gap:12px;align-items:center;padding:10px 6px;border-bottom:1px solid var(--line-soft);}
        .rk-row:last-child{border-bottom:none;}
        .rk-avatar{width:34px;height:34px;border-radius:9px;background:var(--bg-3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text-2);}
        .rk-name{font-size:13.5px;font-weight:600;}
        .rk-sello{font-size:11px;color:var(--text-3);}
        .rk-listeners{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;text-align:right;}
        .rk-deltas{display:flex;gap:8px;font-size:11px;margin-top:2px;flex-wrap:wrap;justify-content:flex-end;}
        .rk-delta-up{color:var(--good);}
        .rk-delta-down{color:var(--crit);}
        .rk-delta-none{color:var(--text-3);}
        .rk-toggle{margin-top:10px;background:transparent;border:1px solid var(--line-soft);border-radius:100px;padding:7px 16px;font-size:12.5px;color:var(--text-2);cursor:pointer;}
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
          <div style={{ marginTop: 8 }}>
            {visible.map((r, i) => (
              <div className="rk-row" key={r.artist_id}>
                <span style={{ color: "var(--text-3)", fontWeight: 600, fontSize: 13 }}>{i + 1}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div className="rk-avatar">{r.artist_name.slice(0, 2).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="rk-name">{r.artist_name}</div>
                    <div className="rk-sello">{r.sello ?? "Sin sello asignado"}</div>
                  </div>
                </div>
                <div>
                  <div className="rk-listeners">
                    {r.monthly_listeners?.toLocaleString("es-AR") ?? "—"}
                  </div>
                  <div className="rk-deltas">
                    <DeltaTag current={r.monthly_listeners} prev={r.prev_day} label="24h" />
                    <DeltaTag current={r.monthly_listeners} prev={r.prev_7d} label="7d" />
                    <DeltaTag current={r.monthly_listeners} prev={r.prev_30d} label="30d" />
                  </div>
                </div>
              </div>
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
