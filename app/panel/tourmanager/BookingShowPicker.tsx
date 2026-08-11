"use client";

import { useEffect, useState } from "react";

export type BookingShowLite = {
  id: string;
  artistName: string;
  fecha: string;
  hora: string | null;
  venue: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  lat: number | null;
  lng: number | null;
};

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

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

// Loads the full Booking shows list once (same all-at-once pattern Booking's
// own ShowCalendar/ArtistAgenda already use for their <datalist>) and filters
// client-side — a bridge route (ver_tourmanager-gated, not ver_booking) is
// what makes this available to a tourmanager-only user.
export default function BookingShowPicker({ onSelect }: { onSelect: (show: BookingShowLite) => void }) {
  const [query, setQuery] = useState("");
  const [shows, setShows] = useState<BookingShowLite[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/tourmanager/booking-shows")
      .then((r) => r.json())
      .then((d) => setShows(d.shows ?? []))
      .catch(() => setShows([]));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
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
        placeholder="Buscar por artista o venue..."
        style={inputStyle}
      />
      {open && q && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--glass-bg-strong)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", borderRadius: 8, boxShadow: "var(--shadow-glass-lg)", zIndex: 20, maxHeight: 240, overflowY: "auto" }}>
          {shows === null && <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-3)" }}>Cargando...</div>}
          {shows !== null && filtered.length === 0 && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-3)" }}>Sin resultados en Booking.</div>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => {
                onSelect(s);
                setQuery("");
                setOpen(false);
              }}
              style={{ display: "block", width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--line-soft)", padding: "8px 10px", color: "var(--text-1)", fontSize: 12.5, cursor: "pointer", textAlign: "left" }}
            >
              <strong>{s.artistName}</strong> — {s.venue || "sin venue"}
              <div style={{ color: "var(--text-3)", fontSize: 11 }}>{formatFecha(s.fecha)}{s.ciudad ? ` · ${s.ciudad}` : ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
