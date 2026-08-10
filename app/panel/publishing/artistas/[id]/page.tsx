"use client";

import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import type { PublishingArtist } from "@/lib/db/publishingArtists";
import { PublishingShell, ArtistForm } from "../../_shared";

const FIELDS: { key: keyof PublishingArtist; label: string }[] = [
  { key: "nombreCompleto", label: "Nombre completo" },
  { key: "apellido", label: "Apellido" },
  { key: "dni", label: "DNI" },
  { key: "cuil", label: "CUIL" },
  { key: "sadaic", label: "N° de SADAIC / IPI" },
  { key: "direccion", label: "Dirección" },
  { key: "localidad", label: "Localidad" },
  { key: "provincia", label: "Provincia" },
  { key: "nacionalidad", label: "Nacionalidad" },
  { key: "fechaNacimiento", label: "Fecha de nacimiento" },
  { key: "email", label: "Correo electrónico" },
  { key: "telefono", label: "Teléfono" },
  { key: "sello", label: "Sello" },
];

export default function ArtistFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequireRole allow={["editorial"]}>
      <ArtistFicha id={id} />
    </RequireRole>
  );
}

function ArtistFicha({ id }: { id: string }) {
  const [artist, setArtist] = useState<PublishingArtist | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function load() {
    fetch(`/api/publishing/artists/${id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? (setError(d.error), setArtist(null)) : setArtist(d.artist)))
      .catch((e) => setError(String(e)));
  }
  useEffect(load, [id]);

  return (
    <PublishingShell
      title={artist ? artist.nombreArtistico : "Ficha de artista"}
      subtitle="Datos personales y de contacto"
      backHref="/panel/publishing/artistas"
    >
      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {artist === undefined ? (
        <p className="muted">Cargando...</p>
      ) : artist === null ? (
        <p className="muted">Artista no encontrado.</p>
      ) : (
        <div className="pub-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <span className={`pub-artist-tag ${artist.tipo === "Propio" ? "propio" : "externo"}`}>{artist.tipo}</span>
            <button className="pub-btn-primary" onClick={() => setEditing(true)}>
              Editar
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {FIELDS.map(({ key, label }) => (
              <div key={key}>
                <div className="card-label">{label}</div>
                <div style={{ fontSize: 13.5, marginTop: 2 }}>{(artist[key] as string | null) || "—"}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="card-label">Observaciones</div>
            <div style={{ fontSize: 13.5, marginTop: 2, whiteSpace: "pre-wrap" }}>{artist.observaciones || "—"}</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="card-label">Documentación adjunta</div>
            {artist.documentoUrl ? (
              <a href={artist.documentoUrl} target="_blank" rel="noopener noreferrer" className="pub-doc-link">
                {artist.documentoNombre ?? "Ver documento"}
              </a>
            ) : (
              <div style={{ fontSize: 13.5, marginTop: 2 }} className="muted">Sin documentación cargada.</div>
            )}
          </div>
        </div>
      )}

      {editing && artist && (
        <ArtistForm
          artist={artist}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </PublishingShell>
  );
}
