"use client";

import { useEffect, useMemo, useState } from "react";
import { EventDetail, selloColor, type CalendarEvent } from "@/app/dashboard/ReleaseCalendar";

type PmReleaseRow = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  estado: string;
  distribuidora: string | null;
  fecha_lanzamiento: string | null;
  hora_lanzamiento: string | null;
  colaboradores: string | null;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
  marketing_plan: boolean;
  marketing_plan_detalle: string | null;
  portada_url: string | null;
};

type SortMode = "proximos" | "artista" | "sello" | "fecha" | "estado";

const SORT_LABELS: Record<SortMode, string> = {
  proximos: "Próximos",
  artista: "Por artista",
  sello: "Por sello",
  fecha: "Por fecha",
  estado: "Por estado",
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function UpcomingReleasesList() {
  const [rows, setRows] = useState<PmReleaseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("proximos");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [query, setQuery] = useState("");
  const [selloFilter, setSelloFilter] = useState("");

  useEffect(() => {
    fetch("/api/management/releases")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setRows(d.releases);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const events = useMemo(() => {
    if (!rows) return [] as CalendarEvent[];
    const today = todayKey();
    const byKey = new Map<string, PmReleaseRow[]>();
    for (const r of rows) {
      if (!r.fecha_lanzamiento) continue;
      if (String(r.fecha_lanzamiento).slice(0, 10) < today) continue;
      const k = r.group_id != null ? `g${r.group_id}` : `r${r.id}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(r);
    }
    const out: CalendarEvent[] = [];
    for (const [key, group] of byKey) {
      const first = group[0];
      const participantes = new Set<string>();
      for (const g of group) {
        if (g.colaboradores) {
          for (const c of g.colaboradores.split(",")) {
            const n = c.trim();
            if (n) participantes.add(n);
          }
        }
      }
      out.push({
        key,
        ids: group.map((g) => g.id),
        groupId: first.group_id,
        fecha: String(first.fecha_lanzamiento).slice(0, 10),
        hora: first.hora_lanzamiento || "00:00",
        titulo: first.group_nombre || first.fonograma_nombre,
        artista: first.artist_name,
        participantes: [...participantes],
        sello: first.sello,
        distribuidora: first.distribuidora,
        estado: first.estado,
        marketingPlan: group.some((g) => g.marketing_plan),
        marketingPlanDetalle: group.find((g) => g.marketing_plan_detalle)?.marketing_plan_detalle ?? null,
        tracks: group.map((g) => g.fonograma_nombre),
        portadaUrl: group.find((g) => g.portada_url)?.portada_url ?? null,
        artistImageUrl: null,
      });
    }

    const sorted = [...out];
    switch (sortMode) {
      case "artista":
        sorted.sort((a, b) => a.artista.localeCompare(b.artista, "es"));
        break;
      case "sello":
        sorted.sort((a, b) => (a.sello ?? "").localeCompare(b.sello ?? "", "es"));
        break;
      case "estado":
        sorted.sort((a, b) => a.estado.localeCompare(b.estado, "es"));
        break;
      case "fecha":
      case "proximos":
      default:
        sorted.sort((a, b) => a.fecha.localeCompare(b.fecha));
        break;
    }
    return sorted;
  }, [rows, sortMode]);

  const selloOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) if (ev.sello) set.add(ev.sello);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [events]);

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((ev) => {
      if (q && !ev.artista.toLowerCase().includes(q) && !ev.titulo.toLowerCase().includes(q)) return false;
      if (selloFilter && ev.sello !== selloFilter) return false;
      return true;
    });
  }, [events, query, selloFilter]);

  async function saveMarketingPlan() {
    // Read-only in Management — marketing plan editing lives in PM/Dashboard.
  }

  return (
    <div className="mgmt-section">
      <style>{`
        .mgupc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 1rem; }
        .mgupc-sort { display: flex; gap: 3px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-pill); padding: 3px; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); flex-wrap: wrap; }
        .mgupc-sort-btn { border: none; background: transparent; border-radius: var(--radius-pill); padding: 6px 13px; font-size: 12px; font-weight: 600; color: var(--text-2); cursor: pointer; }
        .mgupc-sort-btn.active { background: var(--accent-glass-bg); color: var(--text-1); }
        .mgupc-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem; }
        .mgupc-search { flex: 1; min-width: 200px; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 12px; color: var(--text-1); font-size: 13px; font-family: inherit; }
        .mgupc-filters select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 12px; color: var(--text-1); font-size: 12.5px; font-family: inherit; }
        .mgupc-list { display: flex; flex-direction: column; gap: 10px; }
        .mgupc-row { display: flex; align-items: center; gap: 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: .9rem 1.1rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); }
        .mgupc-cover { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
        .mgupc-cover-dot { width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--bg-2); }
        .mgupc-cover-dot .dot { width: 10px; height: 10px; border-radius: 50%; }
        .mgupc-title { font-size: 14.5px; font-weight: 700; }
        .mgupc-meta { font-size: 12px; color: var(--text-3); margin-top: 2px; }
        .mgupc-estado { font-size: 11px; font-weight: 600; padding: 4px 11px; border-radius: 100px; background: var(--bg-2); border: 1px solid var(--glass-border); color: var(--text-2); flex-shrink: 0; }
        .mgupc-detail-btn { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 14px; color: var(--text-2); cursor: pointer; font-size: 12.5px; flex-shrink: 0; }
        .mgupc-detail-btn:hover { border-color: var(--accent-color-glow); color: var(--text-1); }
        .mgupc-empty { color: var(--text-3); font-size: 13.5px; padding: 2rem 0; text-align: center; }
      `}</style>

      <div className="mgupc-head">
        <div className="mgmt-section-label" style={{ marginBottom: 0 }}>Próximos lanzamientos</div>
        <div className="mgupc-sort">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
            <button key={m} className={`mgupc-sort-btn${sortMode === m ? " active" : ""}`} onClick={() => setSortMode(m)}>
              {SORT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="mgupc-filters">
        <input
          className="mgupc-search"
          type="text"
          placeholder="Buscar por artista o título..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={selloFilter} onChange={(e) => setSelloFilter(e.target.value)}>
          <option value="">Todos los sellos</option>
          {selloOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <p className="mgupc-empty">Error: {error}</p>}
      {rows === null && !error && <p className="mgupc-empty">Cargando lanzamientos...</p>}
      {rows !== null && events.length === 0 && <p className="mgupc-empty">No hay lanzamientos próximos.</p>}
      {events.length > 0 && visibleEvents.length === 0 && (
        <p className="mgupc-empty">Ningún lanzamiento coincide con los filtros.</p>
      )}

      {visibleEvents.length > 0 && (
        <div className="mgupc-list">
          {visibleEvents.map((ev) => (
            <div key={ev.key} className="mgupc-row">
              {ev.portadaUrl ? (
                <img src={ev.portadaUrl} alt="" className="mgupc-cover" />
              ) : (
                <div className="mgupc-cover-dot"><span className="dot" style={{ background: selloColor(ev.sello) }} /></div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mgupc-title">{ev.titulo}</div>
                <div className="mgupc-meta">
                  {ev.artista} · {ev.sello ?? "Sin sello"} · {new Date(ev.fecha + "T00:00:00").toLocaleDateString("es-AR")} · {ev.hora} hs
                  {ev.distribuidora ? ` · ${ev.distribuidora}` : ""}
                </div>
              </div>
              <span className="mgupc-estado">{ev.estado}</span>
              <button className="mgupc-detail-btn" onClick={() => setSelected(ev)}>
                Ver detalle
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <EventDetail event={selected} onClose={() => setSelected(null)} onSaveMarketing={saveMarketingPlan} readOnly />
      )}
    </div>
  );
}
