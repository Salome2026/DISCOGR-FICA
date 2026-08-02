"use client";

import { useState } from "react";
import distribucion from "@/data/distribucion.json";

type CompanyRow = {
  company: string;
  count: number;
  pct: number;
};

const data = distribucion as { total: number; companies: CompanyRow[] };

const maxCount = Math.max(...data.companies.map((c) => c.count));

export default function DistribucionChart() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="viz-root border rounded-lg p-5 mb-8">
      <style>{`
        .viz-root {
          color-scheme: light;
          --surface-1: #fcfcfb;
          --text-primary: #0b0b0b;
          --text-secondary: #52514e;
          --text-muted: #898781;
          --gridline: #e1e0d9;
          --baseline: #c3c2b7;
          --series-1: #2a78d6;
          --series-muted: #c3c2b7;
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root {
            color-scheme: dark;
            --surface-1: #1a1a19;
            --text-primary: #ffffff;
            --text-secondary: #c3c2b7;
            --text-muted: #898781;
            --gridline: #2c2c2a;
            --baseline: #383835;
            --series-1: #3987e5;
            --series-muted: #52514e;
          }
        }
        :root[data-theme="dark"] .viz-root {
          color-scheme: dark;
          --surface-1: #1a1a19;
          --text-primary: #ffffff;
          --text-secondary: #c3c2b7;
          --text-muted: #898781;
          --gridline: #2c2c2a;
          --baseline: #383835;
          --series-1: #3987e5;
          --series-muted: #52514e;
        }
        .viz-root { background: var(--surface-1); color: var(--text-primary); }
        .viz-row { display: grid; grid-template-columns: 160px 1fr 90px; align-items: center; gap: 10px; height: 30px; }
        .viz-label { font-size: 13px; color: var(--text-secondary); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .viz-track { position: relative; height: 24px; background: transparent; border-bottom: 1px solid var(--gridline); }
        .viz-bar { position: absolute; left: 0; top: 0; height: 24px; border-radius: 4px; transition: filter 0.1s ease; }
        .viz-value { font-size: 12px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
        .viz-grid { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--gridline); }
      `}</style>

      <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Distribución por discográfica
      </h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        {data.total.toLocaleString("es-AR")} tracks totales · % sobre el catálogo completo
      </p>

      <div style={{ position: "relative" }}>
        {/* gridlines at 0/25/50/75/100% of max */}
        <div
          style={{
            position: "absolute",
            left: 170,
            right: 90,
            top: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <div
              key={f}
              className="viz-grid"
              style={{ left: `${f * 100}%` }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-1 relative">
          {data.companies.map((c) => {
            const isMuted = c.company === "Sin datos";
            const widthPct = (c.count / maxCount) * 100;
            const isHovered = hovered === c.company;
            return (
              <div
                key={c.company}
                className="viz-row"
                onMouseEnter={() => setHovered(c.company)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="viz-label" title={c.company}>
                  {c.company}
                </div>
                <div className="viz-track">
                  <div
                    className="viz-bar"
                    style={{
                      width: `${widthPct}%`,
                      background: isMuted ? "var(--series-muted)" : "var(--series-1)",
                      filter: isHovered ? "brightness(1.15)" : "none",
                    }}
                    title={`${c.company}: ${c.count} tracks (${c.pct}%)`}
                  />
                </div>
                <div className="viz-value">
                  {c.count} · {c.pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        &quot;Sin datos&quot; = tracks donde el Drive no tenía la columna de compañía cargada (no significa que no estén distribuidos).
      </p>
    </div>
  );
}
