"use client";

import { useEffect, useMemo, useState } from "react";

type BookingShow = { id: string; artistName: string; fecha: string; estado: string };

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StatsStrip() {
  const [shows, setShows] = useState<BookingShow[] | null>(null);

  useEffect(() => {
    fetch("/api/booking/shows")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setShows(d.shows);
      })
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    if (!shows) return null;
    const monthKey = currentMonthKey();
    const today = todayKey();
    const thisMonth = shows.filter((s) => s.fecha.startsWith(monthKey));
    const porArtista = new Map<string, number>();
    for (const s of shows) porArtista.set(s.artistName, (porArtista.get(s.artistName) ?? 0) + 1);
    const topArtista = [...porArtista.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      totalMes: thisMonth.length,
      // Split by date rather than estado — every sheet-imported show lands as
      // "Pendiente" by default (the sheet has no real status column), so a
      // Confirmado/Pendiente/Cerrado count would be almost meaningless. Past
      // vs. upcoming is honest regardless of where a show came from.
      historico: shows.filter((s) => s.fecha < today).length,
      proximos: shows.filter((s) => s.fecha >= today).length,
      artistaTop: topArtista ? `${topArtista[0]} (${topArtista[1]})` : "—",
    };
  }, [shows]);

  return (
    <div className="bkg-section">
      <style>{`
        .bksp-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: .9rem; }
        @media (max-width: 900px) { .bksp-row { grid-template-columns: repeat(2, 1fr); } }
        .bksp-kpi { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.1rem 1.2rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); }
        .bksp-kpi .l { font-size: 12px; color: var(--text-2); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
        .bksp-kpi .n { font-size: 26px; font-weight: 700; margin-top: 6px; font-variant-numeric: tabular-nums; }
      `}</style>
      <div className="bksp-row">
        <div className="bksp-kpi"><div className="l">Shows este mes</div><div className="n">{stats?.totalMes ?? "—"}</div></div>
        <div className="bksp-kpi"><div className="l">Histórico</div><div className="n">{stats?.historico ?? "—"}</div></div>
        <div className="bksp-kpi"><div className="l">Próximos</div><div className="n">{stats?.proximos ?? "—"}</div></div>
        <div className="bksp-kpi"><div className="l">Artista con más shows</div><div className="n" style={{ fontSize: 16 }}>{stats?.artistaTop ?? "—"}</div></div>
      </div>
    </div>
  );
}
