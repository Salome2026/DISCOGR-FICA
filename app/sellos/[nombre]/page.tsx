"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { SELLOS, type Sello } from "@/lib/sellos";
import { SELLO_ROSTERS } from "@/lib/roster";
import RosterSelloView from "./RosterSelloView";
import CatalogTracksPanel from "@/app/components/CatalogTracksPanel";

export default function SelloPage({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = use(params);
  const selloName = decodeURIComponent(nombre);
  const router = useRouter();

  // Streamings became a container of projects (/streamings) and La Juntada de
  // los Artistas moved inside it as one of those projects — keep old links working.
  const redirectTo =
    selloName === "Streamings"
      ? "/streamings"
      : selloName === "La Juntada de los Artistas"
      ? "/streamings/La%20Juntada%20de%20los%20Artistas"
      : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  const isKnownSello = (SELLOS as readonly string[]).includes(selloName);
  const roster = isKnownSello ? SELLO_ROSTERS[selloName as Sello] : undefined;
  const hasRoster = !!roster && roster.length > 0;

  if (redirectTo) return null;

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
        .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
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
          <Link href="/dashboard">Dashboard</Link> › {selloName}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{selloName}</h1>

        {!isKnownSello && (
          <p className="empty">Este sello no está en la lista configurada (VPO CORP).</p>
        )}

        {hasRoster ? (
          <RosterSelloView sello={selloName as Sello} />
        ) : isKnownSello ? (
          <CatalogTracksPanel
            apiUrl={`/api/catalog/tracks?sello=${encodeURIComponent(selloName)}`}
            emptyMessage={`Todavía no hay fonogramas asignados a ${selloName}. Asignalos desde la ficha de cada fonograma en Catálogo Distribuido.`}
          />
        ) : null}
      </div>
    </div>
  );
}
