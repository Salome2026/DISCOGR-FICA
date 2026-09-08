"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequirePermission from "@/app/components/RequirePermission";
import ModuleWatermark from "@/app/components/ModuleWatermark";

type ArtistRow = { name: string; sello: string; hasProfile: boolean };

function ArtistasInner() {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/ar/artistas")
      .then((r) => r.json())
      .then((d: { artists?: ArtistRow[] }) => setArtists(d.artists ?? []))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q) || a.sello.toLowerCase().includes(q));
  }, [artists, search]);

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <ModuleWatermark text="A&R" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Link href="/panel/ar" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>← Volver a A&R</Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 0" }}>Análisis por artista</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Identidad, branding, featuring y potencial comercial — generado con IA sobre datos reales del roster.
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por artista o sello..."
          style={{
            background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8,
            padding: "9px 12px", color: "var(--text-1)", fontSize: 13.5,
          }}
        />

        {loading && <div style={{ color: "var(--text-3)", fontSize: 13 }}>Cargando...</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {visible.map((a) => (
            <Link
              key={a.name}
              href={`/panel/ar/artistas/${encodeURIComponent(a.name)}`}
              style={{
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 12,
                padding: "14px 16px", textDecoration: "none", color: "var(--text-1)",
                display: "flex", flexDirection: "column", gap: 4,
              }}
            >
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{a.sello}</div>
              {a.hasProfile && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--good-ink)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Ya tiene análisis
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArArtistasPage() {
  return (
    <RequirePermission need="ver_ar">
      <ArtistasInner />
    </RequirePermission>
  );
}
