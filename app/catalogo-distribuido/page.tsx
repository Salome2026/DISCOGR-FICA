"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
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
  ADA: "#c9825a",
  FUGA: "#e6a94f",
  ONErpm: "#7f9bb0",
  DashGo: "#5c5140",
  "The Orchard": "#8a7c62",
  SoundOn: "#a894c9",
  "Sin distribuidora": "#544831",
};

const estadoColor: Record<string, string> = {
  Firmado: "#7fae6f",
  Contactado: "#8aa0c9",
  "NO SACAR": "#c96a5a",
  "Sin estado": "#8a7c62",
  Aprobado: "#e6a94f",
  "En negociación": "#d99a4e",
  Enviado: "#a894c9",
  "Sin Empezar": "#6b6152",
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

export default function CatalogoDistribuido() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const [acuerdos, setAcuerdos] = useState<Release[] | null>(null);
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [drill, setDrill] = useState<DrillState>(null);

  useEffect(() => {
    fetch("/api/catalog/tracks?unassigned=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setTracksError(d.error);
        else setTracks(d.tracks);
      })
      .catch((e) => setTracksError(String(e)));
    fetch("/api/acuerdos")
      .then((r) => r.json())
      .then((d) => !d.error && setAcuerdos(d.acuerdos))
      .catch(() => {});
  }, []);

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
    <RequireRole allow={["admin"]}>
      <div className="dash-root">
        <style>{`
          .dash-root {
            --bg-0:#2a241c; --bg-0b:#3a3226; --bg-1:#332c22; --bg-2:#3d3427;
            --line:#544831; --line-soft:#403627;
            --text-1:#f4ede1; --text-2:#c2b39a; --text-3:#8f8267;
            --gold:#e6a94f;
            font-family:-apple-system,"SF Pro Display",ui-sans-serif,"Segoe UI",Helvetica,Arial,sans-serif;
            background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-0b) 55%,var(--bg-0) 100%);
            color:var(--text-1);
            min-height:100vh;
            padding-bottom:5rem;
          }
          .inner{max-width:1120px;margin:0 auto;padding:2.5rem 2rem 0;}
          .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
          .crumb a{color:var(--text-2);text-decoration:none;}
          .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}
          .kpi{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.25rem;}
          .kpi-label{font-size:12px;color:var(--text-3);}
          .kpi-num{font-size:26px;font-weight:700;margin-top:6px;}
          .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;margin-bottom:1rem;}
          .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
          table{width:100%;border-collapse:collapse;font-size:13px;}
          th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);}
          td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
          td a{color:var(--gold);text-decoration:none;}
          .empty{color:var(--text-3);font-size:13.5px;padding:1rem 0;}
          .donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;}
          .donut-center .n{font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;font-size:32px;}
          .donut-center .l{font-size:12px;color:var(--text-3);margin-top:2px;}
          .donut-legend{display:flex;flex-direction:column;gap:6px;}
          .leg-row{display:flex;align-items:center;gap:10px;font-size:13px;background:transparent;border:none;padding:5px 6px;border-radius:8px;cursor:pointer;text-align:left;color:inherit;font:inherit;width:100%;}
          .leg-row:hover{background:var(--bg-2);}
          .leg-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
          .leg-name{color:var(--text-2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .leg-val{font-variant-numeric:tabular-nums;font-weight:600;color:var(--text-1);}
          .estado-bars{display:flex;flex-direction:column;gap:10px;margin-top:.5rem;}
          .ebar-row{display:grid;grid-template-columns:120px 1fr 40px;align-items:center;gap:10px;}
          .ebar-name{font-size:12px;color:var(--text-2);}
          .ebar-track{height:16px;background:var(--bg-2);border-radius:6px;overflow:hidden;}
          .ebar-fill{height:100%;border-radius:6px;}
          .ebar-val{font-size:12px;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-1);font-weight:600;}
          .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
          .toolbar input, .toolbar select{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;}
          .toolbar input{flex:1;min-width:200px;}
          .artist-row{cursor:pointer;}
          .artist-row:hover{background:var(--bg-2);}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/dashboard">Dashboard</Link> › Catálogo Distribuido
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Catálogo Distribuido</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
            Fonogramas distribuidos por VPO que todavía no están asignados a ningún sello. Asignalos
            desde la ficha de cada fonograma.
          </p>

          {tracksError && (
            <div style={{ background: "var(--crit-bg, #3d2a24)", color: "#eab3a8", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
              Error cargando el catálogo: {tracksError}
            </div>
          )}

          {!tracks && !tracksError && <p className="empty">Cargando...</p>}

          {tracks && (
            <>
              <div className="kpi-grid">
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
                    <div className="n">{tracks.length}</div>
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

              <div className="card">
                <div className="card-label" style={{ marginBottom: 8 }}>Estado de los acuerdos</div>
                {!acuerdos ? (
                  <p className="empty">Cargando...</p>
                ) : (
                  <div className="estado-bars">
                    {estadoOrder.map((label) => {
                      const count = estadoCounts?.[label] ?? 0;
                      return (
                        <div className="ebar-row" key={label}>
                          <span className="ebar-name">{label}</span>
                          <div className="ebar-track">
                            <div className="ebar-fill" style={{ width: `${(count / maxEstado) * 100}%`, background: estadoColor[label] || "var(--gold)" }} />
                          </div>
                          <span className="ebar-val">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="toolbar">
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
                        className="artist-row"
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
        </div>

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
      </div>
    </RequireRole>
  );
}
