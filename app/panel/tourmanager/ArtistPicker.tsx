"use client";

import { useEffect, useRef, useState } from "react";

export type ArtistResult = { id: string; name: string; photoUrl: string | null };

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

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} style={{ width: 20, height: 20, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--accent-gradient)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 9, flexShrink: 0 }}>
      {initials || "?"}
    </div>
  );
}

// Reuses /api/artists/search — the same roster-wide typeahead the AI
// marketing-plan form and Booking already call — gated only by "logged in
// with a role", not by ver_management, so Tour Manager can call it directly.
export default function ArtistPicker({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelect: (artist: ArtistResult | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQuery(value), [value]);

  function handleChange(v: string) {
    setQuery(v);
    onChange(v);
    onSelect(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists/search?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // silencioso — el campo sigue disponible para carga manual
      }
    }, 250);
  }

  function pick(a: ArtistResult) {
    setQuery(a.name);
    onChange(a.name);
    onSelect(a);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Nombre del artista"
        required
        style={inputStyle}
      />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--glass-bg-strong)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", borderRadius: 8, boxShadow: "var(--shadow-glass-lg)", zIndex: 20, maxHeight: 220, overflowY: "auto" }}>
          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={() => pick(a)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "transparent", border: "none", padding: "8px 10px", color: "var(--text-1)", fontSize: 13, cursor: "pointer", textAlign: "left" }}
            >
              <Avatar name={a.name} url={a.photoUrl} />
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
