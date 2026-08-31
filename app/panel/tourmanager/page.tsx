"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { TourManagerShell } from "./_shared";
import HojaForm from "./HojaForm";
import type { HojaDeRuta } from "@/lib/db/tourManager";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function TourManagerHome() {
  const [hojas, setHojas] = useState<HojaDeRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/tourmanager${showArchived ? "?archived=1" : ""}`)
      .then((r) => r.json())
      .then((d: { hojas?: HojaDeRuta[] }) => setHojas(d.hojas ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showArchived]);

  useEffect(load, [load]);

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      const res = await fetch(`/api/tourmanager/${id}/restore`, { method: "POST" });
      if (res.ok) load();
    } finally {
      setRestoringId(null);
    }
  }

  const filtered = hojas.filter((h) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return h.artistName.toLowerCase().includes(q) || (h.venue ?? "").toLowerCase().includes(q);
  });

  return (
    <TourManagerShell title="Tour Manager" subtitle="Hojas de ruta de cada show">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por artista o venue..."
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line-soft)",
            borderRadius: 8,
            padding: "9px 14px",
            color: "var(--text-1)",
            fontSize: 13,
            minWidth: 240,
          }}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{
              background: showArchived ? "var(--accent-glass-bg)" : "transparent",
              border: "1px solid var(--line-soft)",
              borderRadius: 8,
              padding: "9px 14px",
              color: "var(--text-2)",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {showArchived ? "◂ Ver activas" : "Ver archivadas"}
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: "var(--accent-glass-bg)",
              border: "1px solid var(--accent-glass-border)",
              borderRadius: 8,
              padding: "9px 18px",
              color: "var(--text-1)",
              fontWeight: 600,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            + Nueva hoja de ruta
          </button>
        </div>
      </div>

      {loading && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Cargando...</p>}
      {!loading && filtered.length === 0 && (
        <div className="tm-card" style={{ textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
          {hojas.length === 0
            ? showArchived
              ? "No hay hojas archivadas."
              : "Todavía no hay hojas de ruta cargadas."
            : "Sin resultados para esa búsqueda."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {filtered.map((h) => (
          <Link
            key={h.id}
            href={`/panel/tourmanager/${h.id}`}
            className="tm-card"
            style={{ display: "flex", flexDirection: "column", gap: 6, textDecoration: "none", color: "var(--text-1)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{h.artistName}</div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".03em",
                  padding: "2px 8px",
                  borderRadius: 100,
                  background: h.estado === "Confirmado" ? "var(--good-bg)" : "var(--bg-2)",
                  color: h.estado === "Confirmado" ? "var(--good-ink)" : "var(--text-3)",
                }}
              >
                {h.estado}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
              {formatFecha(h.fecha)}{h.horaShow ? ` · ${h.horaShow}` : ""}{h.tipoEvento ? ` · ${h.tipoEvento}` : ""}
            </div>
            {h.venue && <div style={{ fontSize: 12, color: "var(--text-3)" }}>{h.venue}</div>}
            {showArchived && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRestore(h.id);
                }}
                disabled={restoringId === h.id}
                style={{
                  marginTop: 4,
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 6,
                  padding: "5px 10px",
                  color: "var(--text-2)",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                {restoringId === h.id ? "Restaurando..." : "↺ Restaurar"}
              </button>
            )}
          </Link>
        ))}
      </div>

      {showForm && (
        <HojaForm
          hoja={null}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </TourManagerShell>
  );
}

export default function TourManagerPage() {
  return (
    <RequireRole allow={["tourmanager"]}>
      <TourManagerHome />
    </RequireRole>
  );
}
