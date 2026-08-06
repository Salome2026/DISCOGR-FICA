"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";

type Track = {
  id: string;
  isrc: string | null;
  track: string;
  album: string | null;
  release_date: string | null;
  company: string | null;
  artist_display: string;
  sello: string | null;
};

type ListenerPoint = { measured_at: string; monthly_listeners: number | null; followers: number | null };

type FichaData = {
  artist: string;
  sello: string | null;
  tracks: Track[];
  listeners: {
    latest: { monthly_listeners: number | null; followers: number | null; measured_at: string } | null;
    history: ListenerPoint[];
  };
};

export default function ArtistaFicha({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = use(params);
  const artistName = decodeURIComponent(nombre);
  const [data, setData] = useState<FichaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`/api/artistas/${encodeURIComponent(artistName)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)));
  }, [artistName]);

  const filteredTracks =
    data?.tracks.filter((t) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return t.track.toLowerCase().includes(q) || (t.album || "").toLowerCase().includes(q);
    }) ?? [];

  return (
    <RequireRole allow={["admin", "management"]}>
      <div className="dash-root bg-atmosphere">
        <style>{`
          .dash-root {
            font-family: var(--font-display);
            color:var(--text-1);
            min-height:100vh;
            padding-bottom:5rem;
          }
          .inner{max-width:900px;margin:0 auto;padding:2.5rem 2rem 0;}
          .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
          .crumb a{color:var(--text-2);text-decoration:none;}
          .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.25rem;}
          .kpi{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.25rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
          .kpi-label{font-size:12px;color:var(--text-3);}
          .kpi-num{font-size:24px;font-weight:700;margin-top:6px;}
          .card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
          .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;margin-bottom:10px;}
          table{width:100%;border-collapse:collapse;font-size:13px;}
          th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);}
          td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
          td a{color:var(--accent-color);text-decoration:none;}
          .empty{color:var(--text-3);font-size:13.5px;padding:1rem 0;}
          input{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;width:100%;margin-bottom:12px;}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/catalogo">Catálogo</Link> › Artista
          </div>

          {error && <p className="empty">Error: {error}</p>}
          {!data && !error && <p className="empty">Cargando...</p>}

          {data && (
            <>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, letterSpacing: "-.02em" }}>{data.artist}</h1>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
                {data.sello ?? "Sin sello asignado"}
              </p>

              <div className="kpi-row">
                <div className="kpi">
                  <div className="kpi-label">Fonogramas</div>
                  <div className="kpi-num">{data.tracks.length}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Oyentes mensuales</div>
                  <div className="kpi-num">
                    {data.listeners.latest?.monthly_listeners?.toLocaleString("es-AR") ?? "—"}
                  </div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Seguidores</div>
                  <div className="kpi-num">
                    {data.listeners.latest?.followers?.toLocaleString("es-AR") ?? "—"}
                  </div>
                </div>
              </div>

              {!data.listeners.latest && (
                <div className="card">
                  <p className="empty" style={{ padding: 0 }}>
                    Sin datos de oyentes mensuales todavía — esperando la conexión con Chartmetric y
                    la base histórica. No se muestran números simulados.
                  </p>
                </div>
              )}

              <div className="card">
                <div className="card-label">Fonogramas</div>
                {data.tracks.length === 0 ? (
                  <p className="empty" style={{ padding: 0 }}>
                    No encontré fonogramas de este artista en el catálogo.
                  </p>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar por fonograma o álbum..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <table>
                      <thead>
                        <tr>
                          <th>Fonograma</th>
                          <th>Álbum</th>
                          <th>Sello</th>
                          <th>Distribuidora</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTracks.map((t) => (
                          <tr key={t.id}>
                            <td><Link href={`/fonogramas/${t.id}`}>{t.track}</Link></td>
                            <td>{t.album || "—"}</td>
                            <td>{t.sello || "Sin asignar"}</td>
                            <td>{t.company || "—"}</td>
                            <td>{t.release_date || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
