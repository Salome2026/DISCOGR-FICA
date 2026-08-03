"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import RankingListeners from "@/app/components/RankingListeners";
import EstadisticasIngresos from "./EstadisticasIngresos";
import RegaliasNetas from "./RegaliasNetas";

export default function Catalogo() {
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
          .card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
          .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
          .empty{color:var(--text-3);font-size:13.5px;padding:1rem 0;}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/dashboard">Dashboard</Link> › Catálogo
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, letterSpacing: "-.02em" }}>Catálogo</h1>
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
