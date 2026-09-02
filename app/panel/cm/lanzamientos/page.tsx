"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CM_MATERIALES_LABELS } from "../_shared";

type Launch = {
  id: string;
  artistName: string;
  fonogramaNombre: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  pmEmail: string;
  revisadoPorCm: boolean;
  materialesEstado: string;
};

function formatFecha(v: string | null): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

function CmLanzamientosInner() {
  const [launches, setLaunches] = useState<Launch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/cm/lanzamientos")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setLaunches(d.launches)))
      .catch((e) => setError(String(e)));
  }
  useEffect(load, []);

  return (
    <CmShell title="Lanzamientos" subtitle="Novedades cargadas por Project Manager" active="lanzamientos">
      {error && <div className="cm-badge crit" style={{ marginBottom: 16 }}>{error}</div>}
      {!launches ? (
        <p className="cm-empty">Cargando...</p>
      ) : launches.length === 0 ? (
        <p className="cm-empty">Todavía no hay lanzamientos.</p>
      ) : (
        <div className="cm-grid">
          {launches.map((l) => (
            <Link key={l.id} href={`/panel/cm/lanzamientos/${l.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{l.fonogramaNombre}</div>
                {!l.revisadoPorCm && <span className="cm-badge warn">Sin revisar</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                {l.artistName}{l.sello ? ` · ${l.sello}` : ""} · {formatFecha(l.fechaLanzamiento)}
              </div>
              <span className={`cm-badge ${l.materialesEstado === "assets_disponibles" ? "ok" : ""}`}>
                {CM_MATERIALES_LABELS[l.materialesEstado] ?? l.materialesEstado}
              </span>
            </Link>
          ))}
        </div>
      )}
    </CmShell>
  );
}

export default function CmLanzamientosPage() {
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <CmLanzamientosInner />
    </RequireRole>
  );
}
