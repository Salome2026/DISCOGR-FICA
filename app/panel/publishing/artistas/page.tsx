"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import type { PublishingArtist } from "@/lib/db/publishingArtists";
import { PublishingShell, ArtistForm } from "../_shared";

export default function PublishingArtistasPage() {
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingShell title="Datos de Artistas" subtitle="Artistas propios y externos con ficha editorial completa." backHref="/panel/publishing">
        <ArtistGrid />
      </PublishingShell>
    </RequireRole>
  );
}

function ArtistGrid() {
  const [artists, setArtists] = useState<PublishingArtist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetch("/api/publishing/artists")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setArtists(d.artists)))
      .catch((e) => setError(String(e)));
  }

  useEffect(load, []);

  const q = search.trim().toLowerCase();
  const visible = (artists ?? []).filter((a) => {
    if (!q) return true;
    return (
      a.nombreArtistico.toLowerCase().includes(q) ||
      (a.nombreCompleto ?? "").toLowerCase().includes(q) ||
      (a.apellido ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="pub-toolbar">
        <input
          className="pub-search"
          placeholder="Buscar por nombre artístico, nombre real o apellido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="pub-btn-primary" onClick={() => setShowForm(true)}>
          + Nuevo artista
        </button>
      </div>

      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!artists ? (
        <p className="muted">Cargando...</p>
      ) : visible.length === 0 ? (
        <p className="muted">Sin resultados.</p>
      ) : (
        <div className="pub-artist-grid">
          {visible.map((a) => (
            <Link key={a.id} href={`/panel/publishing/artistas/${a.id}`} className="pub-artist-card">
              <div className="pub-artist-avatar">{a.nombreArtistico.charAt(0).toUpperCase()}</div>
              <div className="pub-artist-name">{a.nombreArtistico}</div>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <ArtistForm
          artist={null}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </>
  );
}
