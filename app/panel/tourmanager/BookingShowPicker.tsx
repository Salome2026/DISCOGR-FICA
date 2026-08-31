"use client";

import { useEffect, useState } from "react";
import type { BookingShow } from "@/lib/db/booking";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-1)",
  fontSize: 13,
  marginTop: 4,
};

function formatFecha(v: string): string {
  return v.slice(0, 10);
}

// Fase 6 del plan original: "¿ya existe este show en Booking?" — un
// combobox hecho a mano (un <datalist> no alcanza porque hace falta el id
// del show elegido, no solo el texto). Trae la lista completa una vez
// (Booking no maneja tantos shows como para justificar un endpoint de
// búsqueda server-side aparte) y filtra en el cliente por artista o venue.
export default function BookingShowPicker({ onSelect }: { onSelect: (show: BookingShow) => void }) {
  const [shows, setShows] = useState<BookingShow[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/tourmanager/booking-shows")
      .then((r) => r.json())
      .then((d) => setShows(d.shows ?? []))
      .catch(() => setShows([]));
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? (shows ?? [])
        .filter((s) => s.artistName.toLowerCase().includes(q) || (s.venue ?? "").toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={shows === null ? "Cargando shows de Booking..." : "Buscar por artista o venue en Booking..."}
        disabled={shows === null}
        style={inputStyle}
      />
      {open && q && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
            background: "var(--glass-bg-strong)", backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)", borderRadius: 8, boxShadow: "var(--shadow-glass-lg)",
            zIndex: 20, maxHeight: 240, overflowY: "auto",
          }}
        >
          {results.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--text-3)" }}>
              No encontramos ningún show con ese nombre.
            </div>
          )}
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => {
                onSelect(s);
                setQuery("");
                setOpen(false);
              }}
              style={{
                display: "flex", flexDirection: "column", gap: 2, width: "100%",
                background: "transparent", border: "none", borderBottom: "1px solid var(--line-soft)",
                padding: "8px 12px", color: "var(--text-1)", fontSize: 13, cursor: "pointer", textAlign: "left",
              }}
            >
              <strong>{s.artistName}</strong>
              <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                {s.venue || "Sin venue"} · {formatFecha(s.fecha)}
                {s.ciudad ? ` · ${s.ciudad}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
