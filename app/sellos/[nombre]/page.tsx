"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import catalogo from "@/data/catalogo.json";
import { assignSello, SELLOS } from "@/lib/sellos";
import type { Release } from "@/lib/notion";

type ArtistEntry = {
  artist: string;
  track_count: number;
  companies: string[];
  tracks: { track: string; isrc: string; company: string }[];
};

const catalogoData = catalogo as ArtistEntry[];

const ESTADO_BADGE: Record<string, string> = {
  Firmado: "#7fae6f",
  "En negociacion": "#d99a4e",
  Contactado: "#8aa0c9",
  Aprobado: "#e6a94f",
  "NO SACAR": "#c96a5a",
  "Enviado a la firma": "#8f8267",
};

export default function SelloPage({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = use(params);
  const selloName = decodeURIComponent(nombre);
  const isLaJuntada = selloName === "La Juntada de los Artistas";

  const [acuerdos, setAcuerdos] = useState<Release[] | null>(null);
  const [acuerdosError, setAcuerdosError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLaJuntada) return;
    fetch("/api/acuerdos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setAcuerdosError(d.error);
        else setAcuerdos(d.acuerdos);
      })
      .catch((e) => setAcuerdosError(String(e)));
  }, [isLaJuntada]);

  const artists = useMemo(
    () => catalogoData.filter((a) => assignSello(a.artist) === selloName),
    [selloName]
  );
  // Verified count from the full album_artist column (Drive), 2026-08-02: 249
  // rows contain "La Juntada de los Artistas" — the catalog pipeline had only
  // picked up 9 of them. Real number used here until the catalog rebuild
  // captures every row (needs the full column set, not just album_artist).
  const JUNTADA_FONOGRAMAS_REAL = 249;
  const totalTracks = isLaJuntada
    ? JUNTADA_FONOGRAMAS_REAL
    : artists.reduce((sum, a) => sum + a.track_count, 0);

  const companyBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artists) {
      for (const t of a.tracks) {
        const c = t.company || "Sin datos";
        m.set(c, (m.get(c) || 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [artists]);

  const isKnownSello = (SELLOS as readonly string[]).includes(selloName);

  return (
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
        .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;}
        .kpi{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.25rem;}
        .kpi-label{font-size:12px;color:var(--text-3);}
        .kpi-num{font-size:30px;font-weight:700;margin-top:6px;}
        .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;margin-bottom:1rem;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        .empty{color:var(--text-3);font-size:13.5px;padding:1rem 0;}
      `}</style>
      <div className="inner">
        <div className="crumb">
          <Link href="/dashboard">Dashboard</Link> › {selloName}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{selloName}</h1>

        {!isKnownSello && (
          <p className="empty">Este sello no está en la lista configurada (VPO CORP).</p>
        )}

        {artists.length === 0 ? (
          <div className="card">
            <p className="empty">
              Todavía no hay artistas asignados a este sello en el mapeo (`lib/sellos.ts`). Pasame
              qué artistas pertenecen a {selloName} y lo agrego.
            </p>
          </div>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Artistas</div>
                <div className="kpi-num">{artists.length}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Fonogramas</div>
                <div className="kpi-num">{totalTracks}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Distribuidoras</div>
                <div className="kpi-num">{companyBreakdown.length}</div>
              </div>
            </div>

            {isLaJuntada && (
              <p style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 16, marginTop: -8 }}>
                El total de fonogramas (249) está verificado contra la planilla de Drive; el listado
                de artistas de abajo todavía no refleja todas esas filas — falta reconstruir el
                catálogo completo con las demás columnas (track, ISRC, fecha).
              </p>
            )}

            <div className="card">
              <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
                Distribución por discográfica
              </p>
              {companyBreakdown.map(([c, n]) => (
                <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                  <span style={{ color: "var(--text-2)" }}>{c}</span>
                  <span style={{ fontWeight: 600 }}>{n}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Artista</th>
                    <th>Fonogramas</th>
                    <th>Distribuidora</th>
                  </tr>
                </thead>
                <tbody>
                  {artists.map((a) => (
                    <tr key={a.artist}>
                      <td>{a.artist}</td>
                      <td>{a.track_count}</td>
                      <td>{a.companies.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {isLaJuntada && (
          <div className="card">
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Acuerdos</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
              En vivo desde Notion
            </p>

            {acuerdosError && (
              <p style={{ color: "#eab3a8", fontSize: 13 }}>
                No se pudo conectar con Notion: {acuerdosError}
              </p>
            )}

            {!acuerdosError && !acuerdos && (
              <p className="empty">Cargando...</p>
            )}

            {acuerdos && acuerdos.length === 0 && (
              <p className="empty">No hay acuerdos todavía.</p>
            )}

            {acuerdos && acuerdos.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Compañía</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>%</th>
                    <th>Audio</th>
                    <th>Portada</th>
                  </tr>
                </thead>
                <tbody>
                  {acuerdos.map((a) => (
                    <tr key={a.id}>
                      <td>{a.nombre || "—"}</td>
                      <td>{a.compania || "—"}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {a.estado.length === 0 && "—"}
                          {a.estado.map((e) => (
                            <span
                              key={e}
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 100,
                                fontWeight: 600,
                                background: ESTADO_BADGE[e] ?? "#8a7c62",
                                color: "#1c1712",
                              }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{a.prioridad || "—"}</td>
                      <td>{a.porcentaje != null ? `${a.porcentaje}%` : "—"}</td>
                      <td>{a.audio ? "✓" : "—"}</td>
                      <td>{a.portada ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
