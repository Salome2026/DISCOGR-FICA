"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import RequireRole from "@/app/components/RequireRole";
import { SELLOS } from "@/lib/sellos";
import { TIPOS_CONTRATO, ESTADOS_CONTRATO, type LegalContract } from "@/lib/db/legalContracts";
import { LegalShell, Badge, Field, inputStyle } from "../_shared";

function isVencido(fechaVencimiento: string | null): boolean {
  if (!fechaVencimiento) return false;
  return new Date(fechaVencimiento) < new Date(new Date().toDateString());
}

export default function ContratosPage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Contratos de Artistas" backHref="/panel/legal">
        <ContratosTab />
      </LegalShell>
    </RequireRole>
  );
}

function ContratosTab() {
  const [contracts, setContracts] = useState<LegalContract[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<LegalContract | "new" | null>(null);

  function load() {
    fetch("/api/legal/contracts")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setContracts(d.contracts)))
      .catch((e) => setError(String(e)));
  }
  useEffect(load, []);

  const visible = contracts?.filter((c) => c.artist.toLowerCase().includes(filter.toLowerCase())) ?? [];

  return (
    <div className="legal-card">
      <div className="legal-toolbar">
        <input className="legal-search" placeholder="Buscar artista..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="legal-btn-primary" onClick={() => setEditing("new")}>
          + Nuevo contrato
        </button>
      </div>

      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!contracts ? (
        <p className="muted">Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Artista</th>
              <th>Tipo</th>
              <th>Contraparte</th>
              <th>Sello</th>
              <th>Firma</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Documento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id}>
                <td className="muted">{c.codigoInterno ?? "—"}</td>
                <td>{c.artist}</td>
                <td className="muted">{c.tipoContrato}</td>
                <td className="muted">{c.contraparte ?? "—"}</td>
                <td className="muted">{c.sello ?? "—"}</td>
                <td className="muted">{c.fechaFirma ?? "—"}</td>
                <td className="muted">{c.fechaVencimiento ?? "—"}</td>
                <td>
                  <Badge label={c.estado} />
                  {c.estado === "Vigente" && isVencido(c.fechaVencimiento) && <span className="legal-warn">⚠ venció</span>}
                </td>
                <td>
                  {c.documentoUrl ? (
                    <a className="legal-doc-link" href={c.documentoUrl} target="_blank" rel="noreferrer">
                      {c.documentoNombre || "Ver PDF"}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <button className="legal-btn-ghost" onClick={() => setEditing(c)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  Sin contratos cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {editing && (
        <ContractForm
          contract={editing === "new" ? null : editing}
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

function ContractForm({
  contract,
  onClose,
  onSaved,
}: {
  contract: LegalContract | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [artist, setArtist] = useState(contract?.artist ?? "");
  const [sello, setSello] = useState(contract?.sello ?? "");
  const [tipoContrato, setTipoContrato] = useState(contract?.tipoContrato ?? TIPOS_CONTRATO[0]);
  const [contraparte, setContraparte] = useState(contract?.contraparte ?? "");
  const [codigoInterno, setCodigoInterno] = useState(contract?.codigoInterno ?? "");
  const [fechaFirma, setFechaFirma] = useState(contract?.fechaFirma ?? "");
  const [fechaVencimiento, setFechaVencimiento] = useState(contract?.fechaVencimiento ?? "");
  const [estado, setEstado] = useState(contract?.estado ?? "Vigente");
  const [notas, setNotas] = useState(contract?.notas ?? "");
  const [documentoUrl, setDocumentoUrl] = useState(contract?.documentoUrl ?? "");
  const [documentoNombre, setDocumentoNombre] = useState(contract?.documentoNombre ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/legal/upload" });
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
      const url = contract ? `/api/legal/contracts/${contract.id}` : "/api/legal/contracts";
      const method = contract ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist, sello: sello || null, tipoContrato, contraparte: contraparte || null,
          codigoInterno: codigoInterno || null, fechaFirma: fechaFirma || null,
          fechaVencimiento: fechaVencimiento || null, estado, documentoUrl: documentoUrl || null,
          documentoNombre: documentoNombre || null, notas: notas || null,
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
        <div style={{ fontSize: 17, fontWeight: 600 }}>{contract ? "Editar contrato" : "Nuevo contrato"}</div>

        <Field label="Artista"><input value={artist} onChange={(e) => setArtist(e.target.value)} required style={inputStyle} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Sello">
              <select value={sello} onChange={(e) => setSello(e.target.value)} style={inputStyle}>
                <option value="">Sin asignar</option>
                {SELLOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Código interno"><input value={codigoInterno} onChange={(e) => setCodigoInterno(e.target.value)} placeholder="Ej: I0049" style={inputStyle} /></Field>
          </div>
        </div>
        <Field label="Tipo de contrato">
          <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)} style={inputStyle}>
            {TIPOS_CONTRATO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Contraparte (si no es el sello mismo)">
          <input value={contraparte} onChange={(e) => setContraparte(e.target.value)} placeholder="Ej: Tango Made In Argentina Publishing" style={inputStyle} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Fecha de firma"><input type="date" value={fechaFirma} onChange={(e) => setFechaFirma(e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Vencimiento"><input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
        <Field label="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
            {ESTADOS_CONTRATO.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Documento (PDF)">
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
