"use client";

import { useState } from "react";

const DISTRIBUCION_PCT = 10;

export default function RegaliasCalc() {
  const [bruto, setBruto] = useState<number>(100);

  const costoDistribucion = (bruto * DISTRIBUCION_PCT) / 100;
  const neto = bruto - costoDistribucion;

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
          --track-bg: #e1e0d9;
          --fill-net: #2a78d6;
          --fill-cost: #eda100;
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root {
            color-scheme: dark;
            --surface-1: #1a1a19;
            --text-primary: #ffffff;
            --text-secondary: #c3c2b7;
            --text-muted: #898781;
            --border: rgba(255,255,255,0.09);
            --track-bg: #2c2c2a;
            --fill-net: #3987e5;
            --fill-cost: #c98500;
          }
        }
        :root[data-theme="dark"] .viz-root {
          color-scheme: dark;
          --surface-1: #1a1a19;
          --text-primary: #ffffff;
          --text-secondary: #c3c2b7;
          --text-muted: #898781;
          --border: rgba(255,255,255,0.09);
          --track-bg: #2c2c2a;
          --fill-net: #3987e5;
          --fill-cost: #c98500;
        }
        .viz-root { background: var(--surface-1); color: var(--text-primary); }
        .rc-bar { position: relative; height: 28px; border-radius: 6px; background: var(--track-bg); overflow: hidden; display: flex; }
        .rc-input {
          width: 120px;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 8px;
          background: transparent;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }
        .rc-legend { display: flex; gap: 16px; margin-top: 10px; font-size: 12.5px; }
        .rc-swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-right: 6px; }
      `}</style>

      <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Regalías netas estimadas
      </h2>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Sobre el 100% de regalías brutas, descontando el costo de distribución (~{DISTRIBUCION_PCT}%)
      </p>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Regalías brutas
        </label>
        <input
          type="number"
          className="rc-input"
          value={bruto}
          min={0}
          onChange={(e) => setBruto(Number(e.target.value) || 0)}
        />
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          (unidad: %, USD, lo que uses)
        </span>
      </div>

      <div className="rc-bar">
        <div
          style={{
            width: `${100 - DISTRIBUCION_PCT}%`,
            background: "var(--fill-net)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 10,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {neto.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
        </div>
        <div
          style={{
            width: `${DISTRIBUCION_PCT}%`,
            background: "var(--fill-cost)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {DISTRIBUCION_PCT}%
        </div>
      </div>

      <div className="rc-legend">
        <span>
          <span className="rc-swatch" style={{ background: "var(--fill-net)" }} />
          Neto: <strong>{neto.toLocaleString("es-AR", { maximumFractionDigits: 2 })}</strong> (
          {100 - DISTRIBUCION_PCT}%)
        </span>
        <span>
          <span className="rc-swatch" style={{ background: "var(--fill-cost)" }} />
          Costo distribución:{" "}
          <strong>{costoDistribucion.toLocaleString("es-AR", { maximumFractionDigits: 2 })}</strong> (
          {DISTRIBUCION_PCT}%)
        </span>
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        Estimación general con el {DISTRIBUCION_PCT}% de costo de distribución habitual. El % real
        varía según el distribuidor (FUGA, ADA, Orchard, etc.) y el contrato específico.
      </p>
    </div>
  );
}
