"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { TourManagerShell } from "./_shared";
import HojaForm from "./HojaForm";
import HojaGenericaForm from "./HojaGenericaForm";
import type { HojaDeRuta } from "@/lib/db/tourManager";
import type { HojaGenerica } from "@discografica/shared/types/tourManager";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

// Unified list item — an especializada hoja and a genérica hoja render as
// very different card content (one show's full details vs. N shows'
// summary), but both need to sort/filter together in one list so the team
// sees everything in one place instead of two separate screens.
type ListItem =
  | { kind: "especializada"; hoja: HojaDeRuta }
  | { kind: "generica"; hoja: HojaGenerica };

function TourManagerHome() {
  const [hojas, setHojas] = useState<HojaDeRuta[]>([]);
  const [genericas, setGenericas] = useState<HojaGenerica[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChoice, setShowChoice] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGenericaForm, setShowGenericaForm] = useState(false);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/tourmanager${showArchived ? "?archived=1" : ""}`).then((r) => r.json()),
      fetch(`/api/tourmanager/genericas${showArchived ? "?archived=1" : ""}`).then((r) => r.json()),
    ])
      .then(([d1, d2]: [{ hojas?: HojaDeRuta[] }, { hojas?: HojaGenerica[] }]) => {
        setHojas(d1.hojas ?? []);
        setGenericas(d2.hojas ?? []);
      })
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

  const items: ListItem[] = [
    ...hojas.map((hoja): ListItem => ({ kind: "especializada", hoja })),
    ...genericas.map((hoja): ListItem => ({ kind: "generica", hoja })),
  ].sort((a, b) => {
    const dateA = a.kind === "especializada" ? a.hoja.fecha : a.hoja.shows[0]?.fecha ?? a.hoja.createdAt;
    const dateB = b.kind === "especializada" ? b.hoja.fecha : b.hoja.shows[0]?.fecha ?? b.hoja.createdAt;
    return (dateA ?? "").localeCompare(dateB ?? "");
  });

  const filtered = items.filter((it) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    if (it.kind === "especializada") {
      return it.hoja.artistName.toLowerCase().includes(q) || (it.hoja.venue ?? "").toLowerCase().includes(q);
    }
    return (
      it.hoja.artistName.toLowerCase().includes(q) ||
      (it.hoja.nombre ?? "").toLowerCase().includes(q) ||
      it.hoja.shows.some((s) => (s.venue ?? "").toLowerCase().includes(q))
    );
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
            onClick={() => setShowChoice(true)}
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
          {items.length === 0
            ? showArchived
              ? "No hay hojas archivadas."
              : "Todavía no hay hojas de ruta cargadas."
            : "Sin resultados para esa búsqueda."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {filtered.map((it) =>
          it.kind === "especializada" ? (
            <Link
              key={`h-${it.hoja.id}`}
              href={`/panel/tourmanager/${it.hoja.id}`}
              className="tm-card"
              style={{ display: "flex", flexDirection: "column", gap: 6, textDecoration: "none", color: "var(--text-1)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{it.hoja.artistName}</div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".03em",
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: it.hoja.estado === "Confirmado" ? "var(--good-bg)" : "var(--bg-2)",
                    color: it.hoja.estado === "Confirmado" ? "var(--good-ink)" : "var(--text-3)",
                  }}
                >
                  {it.hoja.estado}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                {formatFecha(it.hoja.fecha)}{it.hoja.horaShow ? ` · ${it.hoja.horaShow}` : ""}{it.hoja.tipoEvento ? ` · ${it.hoja.tipoEvento}` : ""}
              </div>
              {it.hoja.venue && <div style={{ fontSize: 12, color: "var(--text-3)" }}>{it.hoja.venue}</div>}
              {showArchived && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRestore(it.hoja.id);
                  }}
                  disabled={restoringId === it.hoja.id}
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
                  {restoringId === it.hoja.id ? "Restaurando..." : "↺ Restaurar"}
                </button>
              )}
            </Link>
          ) : (
            <Link
              key={`g-${it.hoja.id}`}
              href={`/panel/tourmanager/genericas/${it.hoja.id}`}
              className="tm-card"
              style={{ display: "flex", flexDirection: "column", gap: 6, textDecoration: "none", color: "var(--text-1)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{it.hoja.artistName}</div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".03em",
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: "var(--accent-glass-bg)",
                    color: "var(--text-2)",
                  }}
                >
                  Genérica
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                {it.hoja.nombre || `${it.hoja.shows.length} show${it.hoja.shows.length === 1 ? "" : "s"}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                {it.hoja.shows.length} show{it.hoja.shows.length === 1 ? "" : "s"}
                {it.hoja.shows[0]?.fecha ? ` · desde ${formatFecha(it.hoja.shows[0].fecha!)}` : ""}
              </div>
            </Link>
          )
        )}
      </div>

      {showChoice && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setShowChoice(false)}
        >
          <div
            className="tm-card"
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", flexDirection: "column", gap: 14, width: 420, maxWidth: "90vw" }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>¿Qué tipo de hoja de ruta?</div>
            <button
              type="button"
              onClick={() => {
                setShowChoice(false);
                setShowGenericaForm(true);
              }}
              style={{ textAlign: "left", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: 14, cursor: "pointer", color: "var(--text-1)" }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Genérica — varios shows</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Búsqueda del artista, venue y recorrido de cada show — ideal para cargar una gira rápido.</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowChoice(false);
                setShowForm(true);
              }}
              style={{ textAlign: "left", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: 14, cursor: "pointer", color: "var(--text-1)" }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Especializada — un show, detalle completo</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Punto de encuentro, prueba de sonido, hotel, horarios de todo el recorrido.</div>
            </button>
          </div>
        </div>
      )}

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

      {showGenericaForm && (
        <HojaGenericaForm
          hoja={null}
          onClose={() => setShowGenericaForm(false)}
          onSaved={() => {
            setShowGenericaForm(false);
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
