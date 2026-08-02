"use client";

import { useState } from "react";
import estado from "@/data/estado_acuerdos.json";

type Acuerdo = { nombre: string; compania: string };
type Item = {
  label: string;
  label_short: string;
  label_full: string;
  count: number;
  pct: number;
  acuerdos: Acuerdo[];
};
const data = estado as { total: number; items: Item[] };

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))];
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number) {
  const gap = 1.2;
  const s = startDeg + gap / 2;
  const e = endDeg - gap / 2;
  const large = e - s > 180 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, rOuter, s);
  const [x2, y2] = polar(cx, cy, rOuter, e);
  const [x3, y3] = polar(cx, cy, rInner, e);
  const [x4, y4] = polar(cx, cy, rInner, s);
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

export default function EstadoDonut() {
  const [active, setActive] = useState<number | null>(null);
  const firmado = data.items.find((i) => i.label === "Firmado");

  let acc = 0;
  const slices = data.items.map((item, i) => {
    const start = (acc / data.total) * 360;
    acc += item.count;
    const end = (acc / data.total) * 360;
    return { ...item, start, end, idx: i };
  });

  const cx = 110;
  const cy = 110;
  const rOuter = 100;
  const rInner = 64;
  const activeSlice = active !== null ? slices[active] : null;

  return (
    <div className="viz-root border rounded-xl p-5 mb-8">
      <style>{`
        .viz-root {
          color-scheme: light;
          --surface-1: #fcfcfb;
          --text-primary: #0b0b0b;
          --text-secondary: #52514e;
          --text-muted: #898781;
          --border: rgba(11,11,11,0.08);
          --hover-bg: rgba(11,11,11,0.045);
          --slice-0: #2a78d6;
          --slice-1: #eb6834;
          --slice-2: #1baf7a;
          --slice-3: #eda100;
          --slice-4: #e87ba4;
          --slice-5: #008300;
          --slice-6: #4a3aa7;
          --slice-7: #e34948;
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root {
            color-scheme: dark;
            --surface-1: #1a1a19;
            --text-primary: #ffffff;
            --text-secondary: #c3c2b7;
            --text-muted: #898781;
            --border: rgba(255,255,255,0.09);
            --hover-bg: rgba(255,255,255,0.06);
            --slice-0: #3987e5;
            --slice-1: #d95926;
            --slice-2: #199e70;
            --slice-3: #c98500;
            --slice-4: #d55181;
            --slice-5: #008300;
            --slice-6: #9085e9;
            --slice-7: #e66767;
          }
        }
        :root[data-theme="dark"] .viz-root {
          color-scheme: dark;
          --surface-1: #1a1a19;
          --text-primary: #ffffff;
          --text-secondary: #c3c2b7;
          --text-muted: #898781;
          --border: rgba(255,255,255,0.09);
          --hover-bg: rgba(255,255,255,0.06);
          --slice-0: #3987e5;
          --slice-1: #d95926;
          --slice-2: #199e70;
          --slice-3: #c98500;
          --slice-4: #d55181;
          --slice-5: #008300;
          --slice-6: #9085e9;
          --slice-7: #e66767;
        }
        .viz-root { background: var(--surface-1); color: var(--text-primary); }
        .legend-grid { display: grid; grid-template-columns: 1fr; gap: 2px; min-width: 0; }
        .legend-row {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          padding: 6px 8px;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          width: 100%;
          text-align: left;
          background: transparent;
          font: inherit;
        }
        .legend-row:hover, .legend-row:focus-visible { background: var(--hover-bg); outline: none; }
        .legend-swatch { width: 10px; height: 10px; border-radius: 3px; }
        .legend-label {
          color: var(--text-secondary);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .legend-value {
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
          font-weight: 600;
          white-space: nowrap;
        }
        .acuerdo-panel { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .acuerdo-panel-head { padding: 8px 12px; font-size: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
        .acuerdo-list { max-height: 200px; overflow-y: auto; }
        .acuerdo-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 12px;
          font-size: 12.5px;
          border-bottom: 1px solid var(--border);
        }
        .acuerdo-row:last-child { border-bottom: none; }
        .acuerdo-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
        .acuerdo-company { flex-shrink: 0; color: var(--text-muted); }
      `}</style>

      <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Estado de los acuerdos
      </h2>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        {data.total} acuerdos (Notion) · pasá el mouse por una categoría para ver el detalle
      </p>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div style={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
          <svg width="200" height="200" viewBox="0 0 220 220">
            {slices.map((s) => {
              const isActive = active === s.idx;
              return (
                <path
                  key={s.label}
                  d={arcPath(cx, cy, isActive ? rOuter + 3 : rOuter, rInner, s.start, s.end)}
                  fill={`var(--slice-${s.idx})`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setActive(s.idx)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(s.idx)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                >
                  <title>{`${s.label}: ${s.count} (${s.pct}%)`}</title>
                </path>
              );
            })}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
              {activeSlice ? `${activeSlice.pct}%` : `${firmado?.pct}%`}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "0 20px",
                lineHeight: 1.2,
              }}
            >
              {activeSlice ? activeSlice.label_short : "firmados"}
            </div>
          </div>
        </div>

        <div className="legend-grid flex-1 w-full min-w-0">
          {slices.map((s) => (
            <button
              key={s.label}
              type="button"
              className="legend-row"
              title={s.label_full}
              onMouseEnter={() => setActive(s.idx)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.idx)}
              onBlur={() => setActive(null)}
              style={{ opacity: active === null || active === s.idx ? 1 : 0.5 }}
            >
              <span className="legend-swatch" style={{ background: `var(--slice-${s.idx})` }} />
              <span className="legend-label">{s.label_short}</span>
              <span className="legend-value">
                {s.count} · {s.pct}%
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeSlice && activeSlice.acuerdos.length > 0 && (
        <div className="mt-4">
          <div className="acuerdo-panel">
            <div className="acuerdo-panel-head">
              {activeSlice.label_full} · {activeSlice.count}
            </div>
            <div className="acuerdo-list">
              {activeSlice.acuerdos.map((a, i) => (
                <div key={i} className="acuerdo-row">
                  <span className="acuerdo-name" title={a.nombre}>
                    {a.nombre}
                  </span>
                  <span className="acuerdo-company">{a.compania || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
