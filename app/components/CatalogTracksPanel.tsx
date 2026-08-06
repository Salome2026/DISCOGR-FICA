"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DrillDown, { Column } from "@/app/components/DrillDown";
import type { Release } from "@/lib/notion";

type Track = {
  id: string;
  isrc: string | null;
  track: string;
  album: string | null;
  release_date: string | null;
  upc: string | null;
  company: string | null;
  artist_display: string;
  participants: string[];
};

const COMPANY_ORDER = ["ADA", "FUGA", "ONErpm", "DashGo", "The Orchard", "SoundOn", "Sin distribuidora"];
const COMPANY_COLOR: Record<string, string> = {
  ADA: "#3fc6d1",
  FUGA: "#eef0f4",
  ONErpm: "#9a9da8",
  DashGo: "#71737d",
  "The Orchard": "#4d4f57",
  SoundOn: "#c3c6cf",
  "Sin distribuidora": "#2f3036",
};

const estadoColor: Record<string, string> = {
  Firmado: "#8fb98a",
  Contactado: "#8aa0c9",
  "NO SACAR": "#c98a86",
  "Sin estado": "#71737d",
  Aprobado: "#dcdde2",
  "En negociación": "#c9a86a",
  Enviado: "#a894c9",
  "Sin Empezar": "#4d4f57",
};

function estadoBucket(estado: string[]): string {
  if (!estado || estado.length === 0) return "Sin estado";
  if (estado.includes("Firmado")) return "Firmado";
  if (estado.includes("NO SACAR")) return "NO SACAR";
  if (estado.includes("Aprobado")) return "Aprobado";
  if (estado.includes("Sin Empezar")) return "Sin Empezar";
  if (
    estado.includes("Enviado Whatsapp") ||
    estado.includes("Enviado Draft por Correo") ||
    estado.includes("Enviado a la firma")
  )
    return "Enviado";
  if (estado.includes("En negociacion")) return "En negociación";
  if (estado.includes("Contactado")) return "Contactado";
  return "Sin estado";
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

const trackColumns: Column<Track & { artistas: string }>[] = [
  { key: "track", label: "Fonograma", render: (r) => <Link href={`/fonogramas/${r.id}`}>{r.track}</Link> },
  { key: "artistas", label: "Artistas / colaboradores" },
  { key: "album", label: "Álbum" },
  { key: "company", label: "Distribuidora" },
  { key: "isrc", label: "ISRC" },
  { key: "release_date", label: "Fecha" },
];

function withRows(list: Track[]) {
  return list.map((t) => ({ ...t, artistas: t.artist_display.replace(/\|/g, ", ") }));
}

type DrillState = { title: string; rows: Track[] } | null;

export default function CatalogTracksPanel({
  apiUrl,
  emptyMessage,
  showEstado = true,
}: {
  apiUrl: string;
  emptyMessage: string;
  showEstado?: boolean;
}) {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const [acuerdos, setAcuerdos] = useState<Release[] | null>(null);
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [drill, setDrill] = useState<DrillState>(null);

  useEffect(() => {
    let cancelled = false;
    function loadTracks() {
      fetch(apiUrl)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (d.error) setTracksError(d.error);
          else setTracks(d.tracks);
        })
        .catch((e) => !cancelled && setTracksError(String(e)));
    }

    setTracks(null);
    setTracksError(null);
    loadTracks();
    fetch("/api/acuerdos")
      .then((r) => r.json())
      .then((d) => !d.error && setAcuerdos(d.acuerdos))
      .catch(() => {});

    // Keeps the catalog "live" without a manual reload — a teammate's
    // upload shows up within 30s, or immediately when you switch back here.
    const interval = setInterval(loadTracks, 30000);
    function onVisible() {
      if (document.visibilityState === "visible") loadTracks();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [apiUrl]);

  const filteredTracks = useMemo(() => {
    if (!tracks) return [];
    let list = tracks;
    if (companyFilter) list = list.filter((t) => (t.company || "Sin distribuidora") === companyFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.track.toLowerCase().includes(q) ||
          t.artist_display.toLowerCase().includes(q) ||
          (t.isrc || "").toLowerCase().includes(q) ||
          (t.album || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [tracks, query, companyFilter]);

  const { artists, breakdown, lastRelease } = useMemo(() => {
    if (!tracks) return { artists: [], breakdown: [], lastRelease: null as string | null };
    const byArtist = new Map<string, { name: string; tracks: Track[] }>();
    const compCounts = new Map<string, number>();
    let last: string | null = null;

    for (const t of tracks) {
      const c = t.company || "Sin distribuidora";
      compCounts.set(c, (compCounts.get(c) || 0) + 1);
      if (t.release_date && /^\d{4}-\d{2}-\d{2}/.test(t.release_date)) {
        if (!last || t.release_date > last) last = t.release_date;
      }
      for (const p of t.participants) {
        const key = norm(p);
        if (!key) continue;
        if (!byArtist.has(key)) byArtist.set(key, { name: p, tracks: [] });
        byArtist.get(key)!.tracks.push(t);
      }
    }

    const breakdown = COMPANY_ORDER.filter((c) => compCounts.has(c)).map((c) => ({
      company: c,
      count: compCounts.get(c)!,
      pct: tracks.length ? Math.round((compCounts.get(c)! / tracks.length) * 1000) / 10 : 0,
    }));

    const artists = [...byArtist.values()].sort((a, b) => b.tracks.length - a.tracks.length);
    return { artists, breakdown, lastRelease: last };
  }, [tracks]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, query]);

  const estadoCounts = useMemo(() => {
    if (!acuerdos) return null;
    const artistKeys = new Set(artists.map((a) => norm(a.name)));
    const buckets: Record<string, number> = {};
    for (const a of acuerdos) {
      if (!artistKeys.has(norm(a.nombre))) continue;
      const b = estadoBucket(a.estado);
      buckets[b] = (buckets[b] || 0) + 1;
    }
    return buckets;
  }, [acuerdos, artists]);

  const circumference = 2 * Math.PI * 80;
  let offset = 0;
  const segs = breakdown.map((c) => {
    const len = tracks?.length ? (c.count / tracks.length) * circumference : 0;
    const seg = { ...c, len, offset };
    offset += len;
    return seg;
  });

  const estadoOrder = ["Firmado", "Contactado", "NO SACAR", "Sin estado", "Aprobado", "En negociación", "Enviado", "Sin Empezar"];
  const maxEstado = estadoCounts ? Math.max(1, ...Object.values(estadoCounts)) : 1;

  return (
    <>
      <style>{`
        .ctp-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}
        .ctp-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
        .ctp-toolbar input, .ctp-toolbar select{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;}
        .ctp-toolbar input{flex:1;min-width:200px;}
        .ctp-artist-row{cursor:pointer;}
        .ctp-artist-row:hover{background:var(--bg-2);}
        .ctp-estado-bars{display:flex;flex-direction:column;gap:10px;margin-top:.5rem;}
        .ctp-ebar-row{display:grid;grid-template-columns:120px 1fr 40px;align-items:center;gap:10px;}
        .ctp-ebar-name{font-size:12px;color:var(--text-2);}
        .ctp-ebar-track{height:16px;background:var(--bg-2);border-radius:6px;overflow:hidden;}
        .ctp-ebar-fill{height:100%;border-radius:6px;}
        .ctp-ebar-val{font-size:12px;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-1);font-weight:600;}
      `}</style>

      {tracksError && (
        <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          Error cargando el catálogo: {tracksError}
        </div>
      )}

      {!tracks && !tracksError && <p className="empty">Cargando...</p>}

      {tracks && tracks.length === 0 && <p className="empty">{emptyMessage}</p>}

      {tracks && tracks.length > 0 && (
        <>
          <div className="ctp-kpi-grid">
            <div className="kpi">
              <div className="kpi-label">Artistas</div>
              <div className="kpi-num">{artists.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Fonogramas</div>
              <div className="kpi-num">{tracks.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Distribuidoras</div>
              <div className="kpi-num">{breakdown.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Último lanzamiento</div>
              <div className="kpi-num" style={{ fontSize: 20 }}>{lastRelease ?? "—"}</div>
            </div>
          </div>

          <div className="card" style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", width: 190, height: 190, flexShrink: 0 }}>
              <svg width="190" height="190" viewBox="0 0 190 190">
                <circle cx="95" cy="95" r="80" fill="none" stroke="var(--bg-2)" strokeWidth="22" />
                {segs.map((s) => (
                  <circle
                    key={s.company}
                    cx="95" cy="95" r="80" fill="none"
                    stroke={COMPANY_COLOR[s.company] ?? "#8a7c62"}
                    strokeWidth="22"
                    strokeDasharray={`${s.len} ${circumference}`}
                    strokeDashoffset={-s.offset}
                    strokeLinecap="round"
                    transform="rotate(-90 95 95)"
                    style={{ cursor: "pointer" }}
                    onClick={() => setDrill({ title: s.company, rows: tracks.filter((t) => (t.company || "Sin distribuidora") === s.company) })}
                  >
                    <title>{`${s.company}: ${s.count} (${s.pct}%)`}</title>
                  </circle>
                ))}
              </svg>
              <div className="donut-center">
                <div className="n" style={{ fontSize: 32 }}>{tracks.length}</div>
                <div className="l">fonogramas</div>
              </div>
            </div>
            <div className="donut-legend" style={{ flex: 1, minWidth: 220 }}>
              <div className="card-label" style={{ marginBottom: 4 }}>Distribución por discográfica</div>
              {segs.map((s) => (
                <button
                  key={s.company}
                  className="leg-row"
                  onClick={() => setDrill({ title: s.company, rows: tracks.filter((t) => (t.company || "Sin distribuidora") === s.company) })}
                >
                  <span className="leg-dot" style={{ background: COMPANY_COLOR[s.company] ?? "#8a7c62" }} />
                  <span className="leg-name">{s.company}</span>
                  <span className="leg-val">{s.count} · {s.pct}%</span>
                </button>
              ))}
            </div>
          </div>

          {showEstado && (
            <div className="card">
              <div className="card-label" style={{ marginBottom: 8 }}>Estado de los acuerdos</div>
              {!acuerdos ? (
                <p className="empty">Cargando...</p>
              ) : (
                <div className="ctp-estado-bars">
                  {estadoOrder.map((label) => {
                    const count = estadoCounts?.[label] ?? 0;
                    return (
                      <div className="ctp-ebar-row" key={label}>
                        <span className="ctp-ebar-name">{label}</span>
                        <div className="ctp-ebar-track">
                          <div className="ctp-ebar-fill" style={{ width: `${(count / maxEstado) * 100}%`, background: estadoColor[label] || "var(--gold)" }} />
                        </div>
                        <span className="ctp-ebar-val">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="ctp-toolbar">
            <input
              type="text"
              placeholder="Buscar por artista, fonograma, álbum o ISRC..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="">Todas las distribuidoras</option>
              {breakdown.map((c) => (
                <option key={c.company} value={c.company}>{c.company}</option>
              ))}
            </select>
          </div>

          <div className="card">
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
              Artistas ({filteredArtists.length})
            </p>
            <table>
              <thead>
                <tr>
                  <th>Artista</th>
                  <th>Fonogramas</th>
                </tr>
              </thead>
              <tbody>
                {filteredArtists.slice(0, 50).map((a) => (
                  <tr
                    key={a.name}
                    className="ctp-artist-row"
                    onClick={() => setDrill({ title: a.name, rows: a.tracks })}
                  >
                    <td>{a.name}</td>
                    <td>{a.tracks.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredArtists.length > 50 && (
              <p className="empty">Mostrando 50 de {filteredArtists.length}. Afiná la búsqueda para ver más.</p>
            )}
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>Fonogramas ({filteredTracks.length})</p>
              <button
                type="button"
                onClick={() => setDrill({ title: "Todos los fonogramas", rows: filteredTracks })}
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 12px", color: "var(--text-1)", fontSize: 12.5, cursor: "pointer" }}
              >
                Ver listado completo
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Fonograma</th>
                  <th>Artistas</th>
                  <th>Distribuidora</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.slice(0, 20).map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/fonogramas/${t.id}`}>{t.track}</Link></td>
                    <td>{t.artist_display.replace(/\|/g, ", ")}</td>
                    <td>{t.company || "—"}</td>
                    <td>{t.release_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTracks.length > 20 && (
              <p className="empty">Mostrando 20 de {filteredTracks.length}. Usá &quot;Ver listado completo&quot; para buscar y paginar.</p>
            )}
          </div>
        </>
      )}

      {drill && (
        <DrillDown
          open
          onClose={() => setDrill(null)}
          title={drill.title}
          subtitle={`${drill.rows.length} fonogramas`}
          rows={withRows(drill.rows)}
          columns={trackColumns}
        />
      )}
    </>
  );
}
