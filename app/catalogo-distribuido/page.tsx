"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import CatalogTracksPanel from "@/app/components/CatalogTracksPanel";

export default function CatalogoDistribuido() {
  return (
    <RequireRole allow={["admin"]}>
      <div className="dash-root bg-atmosphere">
        <style>{`
          .dash-root {
            font-family: var(--font-display);
            color:var(--text-1);
            min-height:100vh;
            padding-bottom:5rem;
          }
          .inner{max-width:1120px;margin:0 auto;padding:2.5rem 2rem 0;}
          .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
          .crumb a{color:var(--text-2);text-decoration:none;}
          .kpi{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.25rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
          .kpi-label{font-size:12px;color:var(--text-3);}
          .kpi-num{font-size:26px;font-weight:700;margin-top:6px;}
          .card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
          .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
          table{width:100%;border-collapse:collapse;font-size:13px;}
          th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);}
          td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
          td a{color:var(--accent-color);text-decoration:none;}
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
            <Link href="/dashboard">Dashboard</Link> › Catálogo Distribuido
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, letterSpacing: "-.02em" }}>Catálogo Distribuido</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
            Fonogramas distribuidos por VPO que todavía no están asignados a ningún sello. Asignalos
            desde la ficha de cada fonograma.
          </p>

          <CatalogTracksPanel
            apiUrl="/api/catalog/tracks?unassigned=1"
            emptyMessage="No hay fonogramas sin asignar. Todo el catálogo tiene un sello."
          />
        </div>
      </div>
    </RequireRole>
  );
}
