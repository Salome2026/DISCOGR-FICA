"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { SELLOS } from "@/lib/sellos";
import type { SignedRelease } from "@/lib/db/legalSignedReleases";
import { LegalShell } from "../_shared";

type Artist = { id: string; name: string; sello: string | null };

export default function ReleasesFonogramasPage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Releases Fonogramas" subtitle="Elegí un artista para ver sus releases firmados." backHref="/panel/legal">
        <ArtistGrid />
      </LegalShell>
    </RequireRole>
  );
}

function ArtistGrid() {
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [releases, setReleases] = useState<SignedRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selloFilter, setSelloFilter] = useState("");

  useEffect(() => {
    fetch("/api/legal/artists")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setArtists(d.artists)))
      .catch((e) => setError(String(e)));
    fetch("/api/legal/signed-releases")
      .then((r) => r.json())
      .then((d) => !d.error && setReleases(d.releases))
      .catch(() => {});
  }, []);

  const countByArtist = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of releases ?? []) map.set(r.artist, (map.get(r.artist) ?? 0) + 1);
    return map;
  }, [releases]);

  const visible = (artists ?? []).filter(
    (a) => a.name.toLowerCase().includes(filter.toLowerCase()) && (!selloFilter || a.sello === selloFilter)
  );

  return (
    <>
      <div className="legal-toolbar" style={{ marginBottom: 20 }}>
        <input className="legal-search" placeholder="Buscar artista..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className="legal-search" value={selloFilter} onChange={(e) => setSelloFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">Todos los sellos</option>
          {SELLOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!artists ? (
        <p className="muted">Cargando...</p>
      ) : visible.length === 0 ? (
        <p className="muted">Sin resultados.</p>
      ) : (
        <div className="legal-artist-grid">
          {visible.map((a) => {
            const count = countByArtist.get(a.name) ?? 0;
            return (
              <Link key={a.id} href={`/panel/legal/releases/${encodeURIComponent(a.name)}`} className="legal-artist-card">
                <div className="legal-artist-avatar">{a.name.charAt(0).toUpperCase()}</div>
                <div className="legal-artist-name">{a.name}</div>
                <div className="legal-artist-meta">{a.sello ?? "Sin sello"}</div>
                <div className="legal-artist-count">{count > 0 ? `${count} release${count > 1 ? "s" : ""} firmado${count > 1 ? "s" : ""}` : "Sin releases"}</div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
