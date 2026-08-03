"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import CatalogTracksPanel from "@/app/components/CatalogTracksPanel";
import type { Release } from "@/lib/notion";

const ESTADO_BADGE: Record<string, string> = {
  Firmado: "#7fae6f",
  "En negociacion": "#d99a4e",
  Contactado: "#8aa0c9",
  Aprobado: "#e6a94f",
  "NO SACAR": "#c96a5a",
  "Enviado a la firma": "#8f8267",
};

export default function StreamingProjectPage({
  params,
}: {
  params: Promise<{ proyecto: string }>;
}) {
  const { proyecto } = use(params);
  const proyectoName = decodeURIComponent(proyecto);
  const isLaJuntada = proyectoName === "La Juntada de los Artistas";

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
          .donut-center .n{font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
          .donut-center .l{font-size:12px;color:var(--text-3);margin-top:2px;}
          .donut-legend{display:flex;flex-direction:column;gap:6px;}
          .leg-row{display:flex;align-items:center;gap:10px;font-size:13px;background:transparent;border:none;padding:5px 6px;border-radius:8px;cursor:pointer;text-align:left;color:inherit;font:inherit;width:100%;}
          .leg-row:hover{background:var(--bg-2);}
          .leg-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
          .leg-name{color:var(--text-2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .leg-val{font-variant-numeric:tabular-nums;font-weight:600;color:var(--text-1);}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/dashboard">Dashboard</Link> › <Link href="/streamings">Streamings</Link> › {proyectoName}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{proyectoName}</h1>

          <CatalogTracksPanel
            apiUrl={`/api/catalog/tracks?project=${encodeURIComponent(proyectoName)}`}
            emptyMessage={`Todavía no hay fonogramas asignados a ${proyectoName}. Cargalos desde "+ Nuevo lanzamiento" eligiendo Streamings, o asignalos desde la ficha de cada fonograma en Catálogo Distribuido.`}
          />

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

              {!acuerdosError && !acuerdos && <p className="empty">Cargando...</p>}

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
    </RequireRole>
  );
}
