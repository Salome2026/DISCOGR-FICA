"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import RankingListeners from "@/app/components/RankingListeners";
import EstadisticasIngresos from "./EstadisticasIngresos";
import RegaliasNetas from "./RegaliasNetas";

export default function Catalogo() {
  return (
    <RequireRole allow={["admin"]}>
      <div className="dash-root">
        <style>{`
          .dash-root {
            --bg-0:#2a241c; --bg-0b:#3a3226; --bg-1:#332c22; --bg-2:#3d3427;
            --line:#544831; --line-soft:#403627;
            --text-1:#f4ede1; --text-2:#c2b39a; --text-3:#8f8267;
            --gold:#e6a94f; --good:#7fae6f; --crit:#c96a5a;
            font-family:-apple-system,"SF Pro Display",ui-sans-serif,"Segoe UI",Helvetica,Arial,sans-serif;
            background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-0b) 55%,var(--bg-0) 100%);
            color:var(--text-1);
            min-height:100vh;
            padding-bottom:5rem;
          }
          .inner{max-width:1120px;margin:0 auto;padding:2.5rem 2rem 0;}
          .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
          .crumb a{color:var(--text-2);text-decoration:none;}
          .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;margin-bottom:1rem;}
          .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
          .empty{color:var(--text-3);font-size:13.5px;padding:1rem 0;}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/dashboard">Dashboard</Link> › Catálogo
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Catálogo</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
            Ranking de artistas, estadísticas de ingresos y reparto de regalías.
          </p>

          <RankingListeners />
          <EstadisticasIngresos />
          <RegaliasNetas />
        </div>
      </div>
    </RequireRole>
  );
}
