"use client";

import { useEffect, useMemo, useState } from "react";

type BookingShow = { id: string; artistName: string; fecha: string; estado: string };

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
    const thisMonth = shows.filter((s) => s.fecha.startsWith(monthKey));
    const porArtista = new Map<string, number>();
    for (const s of shows) porArtista.set(s.artistName, (porArtista.get(s.artistName) ?? 0) + 1);
    const topArtista = [...porArtista.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      totalMes: thisMonth.length,
      confirmados: shows.filter((s) => s.estado === "Confirmado").length,
      pendientes: shows.filter((s) => s.estado === "Pendiente").length,
      cerrados: shows.filter((s) => s.estado === "Cerrado").length,
      artistaTop: topArtista ? `${topArtista[0]} (${topArtista[1]})` : "—",
    };
  }, [shows]);

  return (
    <div className="bkg-section">
      <style>{`
        .bksp-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: .9rem; }
        @media (max-width: 900px) { .bksp-row { grid-template-columns: repeat(2, 1fr); } }
        .bksp-kpi { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.1rem 1.2rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); }
        .bksp-kpi .l { font-size: 12px; color: var(--text-2); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
        .bksp-kpi .n { font-size: 26px; font-weight: 700; margin-top: 6px; font-variant-numeric: tabular-nums; }
      `}</style>
      <div className="bksp-row">
        <div className="bksp-kpi"><div className="l">Shows este mes</div><div className="n">{stats?.totalMes ?? "—"}</div></div>
        <div className="bksp-kpi"><div className="l">Confirmados</div><div className="n">{stats?.confirmados ?? "—"}</div></div>
        <div className="bksp-kpi"><div className="l">Pendientes</div><div className="n">{stats?.pendientes ?? "—"}</div></div>
        <div className="bksp-kpi"><div className="l">Cerrados</div><div className="n">{stats?.cerrados ?? "—"}</div></div>
        <div className="bksp-kpi"><div className="l">Artista con más shows</div><div className="n" style={{ fontSize: 16 }}>{stats?.artistaTop ?? "—"}</div></div>
      </div>
    </div>
  );
}
