"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import RequireRole from "@/app/components/RequireRole";
import type { ExternalRelease } from "@/lib/db/externalReleases";
import { LegalShell, Field, inputStyle, legalFileUrl } from "../_shared";

export default function ReleasesExternosPage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell
        title="Releases Externos"
        subtitle="Lanzamientos de nuestros artistas que salieron por fuera de la plataforma."
        backHref="/panel/legal"
      >
        <ExternalReleasesTab />
      </LegalShell>
    </RequireRole>
  );
}

function ExternalReleasesTab() {
  const [releases, setReleases] = useState<ExternalRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<ExternalRelease | "new" | null>(null);

  function load() {
    fetch("/api/legal/external-releases")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setReleases(d.releases)))
      .catch((e) => setError(String(e)));
  }
  useEffect(load, []);

  const visible = (releases ?? []).filter(
    (r) => r.artist.toLowerCase().includes(filter.toLowerCase()) || r.titulo.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="legal-card">
      <div className="legal-toolbar">
        <input className="legal-search" placeholder="Buscar por artista o título..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="legal-btn-primary" onClick={() => setEditing("new")}>
          + Agregar release externo
        </button>
      </div>

      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!releases ? (
        <p className="muted">Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Artista</th>
              <th>Título</th>
              <th>Sello externo</th>
              <th>Fecha</th>
              <th>Vínculo</th>
              <th>Documento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.artist}
                  {r.requiereRevision && <span className="legal-warn" title="Requiere revisión">⚠ revisar</span>}
                </td>
                <td>{r.titulo}</td>
                <td className="muted">{r.selloExterno ?? "—"}</td>
                <td className="muted">{r.fechaLanzamiento ?? "—"}</td>
                <td className="muted">{r.vinculo ?? "—"}</td>
                <td>
                  {r.documentoUrl ? (
                    <a className="legal-doc-link" href={legalFileUrl(r.documentoUrl)} target="_blank" rel="noreferrer">
                      {r.documentoNombre || "Ver PDF"}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <button className="legal-btn-ghost" onClick={() => setEditing(r)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  Sin releases externos cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {editing && (
        <ExternalReleaseForm
          release={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ExternalReleaseForm({
  release,
  onClose,
  onSaved,
}: {
  release: ExternalRelease | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [artist, setArtist] = useState(release?.artist ?? "");
  const [titulo, setTitulo] = useState(release?.titulo ?? "");
  const [selloExterno, setSelloExterno] = useState(release?.selloExterno ?? "");
  const [fechaLanzamiento, setFechaLanzamiento] = useState(release?.fechaLanzamiento ?? "");
  const [vinculo, setVinculo] = useState(release?.vinculo ?? "");
  const [notas, setNotas] = useState(release?.notas ?? "");
  const [requiereRevision, setRequiereRevision] = useState(release?.requiereRevision ?? false);
  const [documentoUrl, setDocumentoUrl] = useState(release?.documentoUrl ?? "");
  const [documentoNombre, setDocumentoNombre] = useState(release?.documentoNombre ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, { access: "private", handleUploadUrl: "/api/legal/upload" });
      setDocumentoUrl(blob.url);
      setDocumentoNombre(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url = release ? `/api/legal/external-releases/${release.id}` : "/api/legal/external-releases";
      const method = release ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist, titulo, selloExterno: selloExterno || null, fechaLanzamiento: fechaLanzamiento || null,
          vinculo: vinculo || null, documentoUrl: documentoUrl || null, documentoNombre: documentoNombre || null,
          notas: notas || null, requiereRevision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", overflowY: "auto" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ background: "var(--glass-bg-strong)", backdropFilter: "blur(40px) saturate(1.7)", WebkitBackdropFilter: "blur(40px) saturate(1.7)", color: "var(--text-1)", borderRadius: 16, border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-glass-lg)", width: "100%", maxWidth: 460, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>{release ? "Editar release externo" : "Nuevo release externo"}</div>

        <Field label="Artista"><input value={artist} onChange={(e) => setArtist(e.target.value)} required style={inputStyle} /></Field>
        <Field label="Título del lanzamiento"><input value={titulo} onChange={(e) => setTitulo(e.target.value)} required style={inputStyle} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Sello / distribuidora externa"><input value={selloExterno} onChange={(e) => setSelloExterno(e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Fecha de lanzamiento"><input type="date" value={fechaLanzamiento} onChange={(e) => setFechaLanzamiento(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
        <Field label="Vínculo con nuestro artista">
          <input
            value={vinculo}
            onChange={(e) => setVinculo(e.target.value)}
            placeholder="Ej: Feat. en tema de otro sello, lanzamiento previo a firmar con nosotros..."
            style={inputStyle}
          />
        </Field>
        <Field label="Documento de respaldo (PDF, opcional)">
          <input
            type="file"
            accept="application/pdf"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            style={{ ...inputStyle, padding: "6px 8px" }}
          />
          {uploading && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>Subiendo...</div>}
          {documentoNombre && !uploading && <div style={{ fontSize: 11.5, color: "var(--good-ink)", marginTop: 4 }}>✓ {documentoNombre}</div>}
        </Field>
        <Field label="Notas">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
          <input type="checkbox" checked={requiereRevision} onChange={(e) => setRequiereRevision(e.target.checked)} />
          Requiere revisión legal
        </label>

        {error && <div style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} className="legal-btn-primary">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
