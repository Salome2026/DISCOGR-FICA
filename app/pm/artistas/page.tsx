"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../_shared";

type AssignedArtist = {
  artistId: string;
  artistName: string;
  pmEmail: string;
  photoUrl: string | null;
  sello: string | null;
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="pmx-artist-avatar-img" />;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return <div className="pmx-artist-avatar-fallback">{initials || "?"}</div>;
}

function ArtistasInner() {
  const [artists, setArtists] = useState<AssignedArtist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingByArtist, setPendingByArtist] = useState<Record<string, number>>({});

  function load() {
    fetch("/api/pm/artistas")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setArtists(d.artists);
      })
      .catch((e) => setError(String(e)));
    fetch("/api/pm/material-requests?status=Pendiente")
      .then((r) => r.json())
      .then((d) => {
        const counts: Record<string, number> = {};
        for (const r of d.requests ?? []) counts[r.artistId] = (counts[r.artistId] ?? 0) + 1;
        setPendingByArtist(counts);
      });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <PMShell title="Mis Artistas" backHref="/pm">
      {error && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {artists === null && !error && <p style={{ color: "var(--text-3)" }}>Cargando...</p>}
      {artists?.length === 0 && (
        <p style={{ color: "var(--text-3)" }}>Todavía no tenés artistas asignados. Pedile a Management que te asigne uno.</p>
      )}
      <div className="pmx-artist-grid">
        {artists?.map((a) => (
          <Link key={a.artistId} href={`/pm/artistas/${a.artistId}`} className="pmx-artist-card" style={{ position: "relative" }}>
            {pendingByArtist[a.artistId] > 0 && (
              <span
                style={{
                  position: "absolute", top: 8, right: 8, background: "var(--warn-ink)", color: "#fff",
                  borderRadius: 100, fontSize: 11, fontWeight: 700, padding: "2px 7px", lineHeight: 1.4,
                }}
              >
                {pendingByArtist[a.artistId]} pedido{pendingByArtist[a.artistId] > 1 ? "s" : ""}
              </span>
            )}
            <Avatar name={a.artistName} url={a.photoUrl} />
            <div>
              <div className="pmx-artist-card-name">{a.artistName}</div>
              {a.sello && <div className="pmx-artist-card-sello">{a.sello}</div>}
            </div>
          </Link>
        ))}
      </div>
    </PMShell>
  );
}

export default function ArtistasPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <ArtistasInner />
    </RequireRole>
  );
}
