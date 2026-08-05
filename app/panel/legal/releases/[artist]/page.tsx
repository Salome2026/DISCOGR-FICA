"use client";

import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import type { SignedRelease } from "@/lib/db/legalSignedReleases";
import { LegalShell, SignedReleaseForm } from "../../_shared";

export default function ArtistReleasesPage({ params }: { params: Promise<{ artist: string }> }) {
  const { artist: artistParam } = use(params);
  const artist = decodeURIComponent(artistParam);

  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title={artist} subtitle="Releases de fonogramas firmados" backHref="/panel/legal/releases">
        <ArtistReleases artist={artist} />
      </LegalShell>
    </RequireRole>
  );
}

function ArtistReleases({ artist }: { artist: string }) {
  const [releases, setReleases] = useState<SignedRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<SignedRelease | null | "new">(null);

  function load() {
    fetch("/api/legal/signed-releases")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setReleases(d.releases)))
      .catch((e) => setError(String(e)));
  }
  useEffect(load, []);

  const forArtist = (releases ?? [])
    .filter((r) => r.artist === artist)
    .sort((a, b) => (b.fechaFirma ?? "").localeCompare(a.fechaFirma ?? ""));

  return (
    <>
      <div className="legal-toolbar" style={{ marginBottom: 20 }}>
        <div />
        <button className="legal-btn-primary" onClick={() => setFormFor("new")}>
          + Agregar release firmado
        </button>
      </div>

      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!releases ? (
        <p className="muted">Cargando...</p>
      ) : forArtist.length === 0 ? (
        <p className="muted">Todavía no hay releases firmados cargados para {artist}.</p>
      ) : (
        <div className="legal-release-grid">
          {forArtist.map((r) => (
            <ReleaseCard key={r.id} release={r} onEdit={() => setFormFor(r)} />
          ))}
        </div>
      )}

      {formFor && (
        <SignedReleaseForm
          release={formFor === "new" ? null : formFor}
          lockedArtist={artist}
          onClose={() => setFormFor(null)}
          onSaved={() => {
            setFormFor(null);
            load();
          }}
        />
      )}
    </>
  );
}

function ReleaseCard({ release, onEdit }: { release: SignedRelease; onEdit: () => void }) {
  const content = (
    <>
      <button
        className="legal-release-edit"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
      >
        Editar
      </button>
      <div className="legal-release-song">{release.fonograma}</div>
      <div className="legal-release-feat">{release.featuring ? `Feat. ${release.featuring}` : "Sin featuring"}</div>
      {release.fechaFirma && <div className="legal-release-date">Firmado el {release.fechaFirma}</div>}
      {!release.documentoUrl && <div className="muted" style={{ fontSize: 11 }}>Sin documento cargado</div>}
    </>
  );

  if (release.documentoUrl) {
    return (
      <a href={release.documentoUrl} target="_blank" rel="noreferrer" className="legal-release-card">
        {content}
      </a>
    );
  }
  return (
    <div className="legal-release-card" style={{ cursor: "default" }}>
      {content}
    </div>
  );
}
