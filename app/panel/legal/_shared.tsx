"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { SELLOS } from "@/lib/sellos";
import { TIPOS_CONTRATO, ESTADOS_CONTRATO, type LegalContract } from "@/lib/db/legalContracts";
import type { SignedRelease } from "@/lib/db/legalSignedReleases";

export const ESTADO_BADGE: Record<string, { bg: string; ink: string }> = {
  Vigente: { bg: "var(--good-bg)", ink: "var(--good-ink)" },
  Vencido: { bg: "var(--crit-bg)", ink: "var(--crit-ink)" },
  Pendiente: { bg: "rgba(217,164,65,.16)", ink: "var(--warn-ink)" },
  Rescindido: { bg: "var(--bg-2)", ink: "var(--text-3)" },
  Finalizado: { bg: "var(--bg-2)", ink: "var(--text-3)" },
  Potencial: { bg: "rgba(139,147,232,.16)", ink: "#8b93e8" },
  Firmado: { bg: "var(--good-bg)", ink: "var(--good-ink)" },
  Contactado: { bg: "rgba(217,164,65,.16)", ink: "var(--warn-ink)" },
  "NO SACAR": { bg: "var(--crit-bg)", ink: "var(--crit-ink)" },
};

export function Badge({ label }: { label: string }) {
  const c = ESTADO_BADGE[label] ?? { bg: "var(--bg-2)", ink: "var(--text-3)" };
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 9px",
        borderRadius: 100,
        fontWeight: 600,
        background: c.bg,
        color: c.ink,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export const LEGAL_STYLES = `
  .legal-root {
    --legal-accent: #c9a668;
    --legal-accent-ink: #241d0f;
    --legal-glow: rgba(201, 166, 104, 0.28);
    font-family: var(--font-display);
    color: var(--text-1);
    min-height: 100vh;
    padding-bottom: 5rem;
  }
  .legal-inner { max-width: 1180px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .legal-inner.legal-home { max-width: 980px; }
  .legal-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 1.75rem; flex-wrap: wrap; }
  .legal-back { background: none; border: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; padding: 0; margin-bottom: 10px; display: inline-block; text-decoration: none; }
  .legal-kicker { font-size: 11px; color: var(--legal-accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
  .legal-title { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -.02em; }
  .legal-sub { font-size: 13px; color: var(--text-3); margin-top: 4px; }
  .legal-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 16px; color: var(--text-2); cursor: pointer; font-size: 12.5px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }
  .legal-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.5rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
  .legal-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .legal-search { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 12px; color: var(--text-1); font-size: 13px; min-width: 240px; }
  .legal-btn-primary { background: linear-gradient(155deg, var(--legal-accent), #a3854f); border: none; border-radius: 8px; padding: 10px 18px; color: var(--legal-accent-ink); font-weight: 700; cursor: pointer; font-size: 13.5px; }
  .legal-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 6px 12px; color: var(--text-2); cursor: pointer; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; color: var(--text-3); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
  td { padding: 8px 10px; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
  .legal-doc-link { color: var(--legal-accent); text-decoration: none; font-size: 12px; }
  .legal-warn { color: var(--crit-ink); font-size: 10.5px; margin-left: 6px; }
  .muted { color: var(--text-3); }

  /* Shared with the Dashboard's ReleaseCalendar, embedded here read-only */
  .card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-xl); padding: 1.4rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
  .card-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: .07em; font-weight: 500; }
  .kpi-chip { font-size: 10px; padding: 2px 7px; border-radius: 100px; font-weight: 600; }

  .legal-home-grid { display: flex; flex-direction: column; gap: 1.5rem; align-items: stretch; }
  .legal-home-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  @media (max-width: 640px) { .legal-home-buttons { grid-template-columns: 1fr; } }
  .legal-ficha-buttons { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 720px) { .legal-ficha-buttons { grid-template-columns: 1fr; } }
  .legal-big-btn {
    display: flex; flex-direction: column; gap: 8px; align-items: flex-start; text-align: left;
    background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
    padding: 1.75rem; text-decoration: none; color: var(--text-1);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); cursor: pointer;
    transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .legal-big-btn:hover { border-color: var(--legal-accent); transform: translateY(-2px); }
  .legal-big-btn h2 { font-size: 17px; font-weight: 700; margin: 0; }
  .legal-big-btn p { font-size: 12.5px; color: var(--text-3); margin: 0; line-height: 1.5; }

  .legal-artist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
  .legal-artist-card {
    aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg);
    text-decoration: none; color: var(--text-1); padding: 1rem; text-align: center;
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .legal-artist-card:hover { border-color: var(--legal-accent); transform: translateY(-2px); }
  .legal-artist-avatar {
    width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 700; background: linear-gradient(155deg, var(--legal-accent), #a3854f); color: var(--legal-accent-ink);
  }
  .legal-artist-name { font-size: 13px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .legal-artist-meta { font-size: 10.5px; color: var(--text-3); }
  .legal-artist-count { font-size: 9.5px; color: var(--legal-accent); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }

  .legal-release-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .legal-release-card {
    display: flex; flex-direction: column; gap: 8px; position: relative;
    background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg);
    text-decoration: none; color: var(--text-1); padding: 1.1rem;
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .legal-release-card:hover { border-color: var(--legal-accent); transform: translateY(-2px); }
  .legal-release-song { font-size: 14.5px; font-weight: 700; line-height: 1.3; }
  .legal-release-feat { font-size: 12px; color: var(--text-3); }
  .legal-release-date { font-size: 10.5px; color: var(--legal-accent); font-weight: 600; }
  .legal-release-edit {
    position: absolute; top: 10px; right: 10px; background: var(--glass-bg); border: 1px solid var(--glass-border);
    border-radius: 6px; padding: 3px 8px; color: var(--text-2); cursor: pointer; font-size: 10.5px;
  }
`;

export function LegalShell({
  title,
  subtitle,
  backHref,
  homeMaxWidth = false,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  homeMaxWidth?: boolean;
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  return (
    <div className="legal-root bg-atmosphere">
      <style>{LEGAL_STYLES}</style>
      <div className={`legal-inner ${homeMaxWidth ? "legal-home" : ""}`}>
        <div className="legal-topbar">
          <div>
            {backHref && (
              <Link href={backHref} className="legal-back">
                ← Volver
              </Link>
            )}
            <div className="legal-kicker">Módulo independiente · Solo equipo legal</div>
            <h1 className="legal-title">{title}</h1>
            <div className="legal-sub">{subtitle ?? session?.user?.email}</div>
          </div>
          <button className="legal-signout" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesión
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>{label}</label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-1)",
  fontSize: 13,
  marginTop: 4,
};

export function ContractForm({
  contract,
  lockedArtist,
  lockedTipo,
  onClose,
  onSaved,
}: {
  contract: LegalContract | null;
  // When creating from within an artist's ficha, the artist and category
  // are already known — lock those fields instead of asking again.
  lockedArtist?: string;
  lockedTipo?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [artist, setArtist] = useState(contract?.artist ?? lockedArtist ?? "");
  const [sello, setSello] = useState(contract?.sello ?? "");
  const [tipoContrato, setTipoContrato] = useState(contract?.tipoContrato ?? lockedTipo ?? TIPOS_CONTRATO[0]);
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

        <Field label="Artista">
          <input value={artist} onChange={(e) => setArtist(e.target.value)} required disabled={!!lockedArtist} style={{ ...inputStyle, opacity: lockedArtist ? 0.65 : 1 }} />
        </Field>
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
        <Field label="Categoría">
          <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)} disabled={!!lockedTipo} style={{ ...inputStyle, opacity: lockedTipo ? 0.65 : 1 }}>
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

export function SignedReleaseForm({
  release,
  lockedArtist,
  onClose,
  onSaved,
}: {
  release: SignedRelease | null;
  // Reached from an artist's own releases page — the artist is already known.
  lockedArtist?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [artist, setArtist] = useState(release?.artist ?? lockedArtist ?? "");
  const [sello, setSello] = useState(release?.sello ?? "");
  const [fonograma, setFonograma] = useState(release?.fonograma ?? "");
  const [featuring, setFeaturing] = useState(release?.featuring ?? "");
  const [fechaFirma, setFechaFirma] = useState(release?.fechaFirma ?? "");
  const [notas, setNotas] = useState(release?.notas ?? "");
  const [documentoUrl, setDocumentoUrl] = useState(release?.documentoUrl ?? "");
  const [documentoNombre, setDocumentoNombre] = useState(release?.documentoNombre ?? "");
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
      const url = release ? `/api/legal/signed-releases/${release.id}` : "/api/legal/signed-releases";
      const method = release ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist, sello: sello || null, fonograma, featuring: featuring || null,
          fechaFirma: fechaFirma || null, documentoUrl: documentoUrl || null,
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
        <div style={{ fontSize: 17, fontWeight: 600 }}>{release ? "Editar release firmado" : "Nuevo release firmado"}</div>

        <Field label="Artista">
          <input value={artist} onChange={(e) => setArtist(e.target.value)} required disabled={!!lockedArtist} style={{ ...inputStyle, opacity: lockedArtist ? 0.65 : 1 }} />
        </Field>
        <Field label="Nombre de la canción">
          <input value={fonograma} onChange={(e) => setFonograma(e.target.value)} required style={inputStyle} />
        </Field>
        <Field label="Featuring (si tiene)">
          <input value={featuring} onChange={(e) => setFeaturing(e.target.value)} placeholder="Ej: Coty Hernández" style={inputStyle} />
        </Field>
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
            <Field label="Fecha de firma"><input type="date" value={fechaFirma} onChange={(e) => setFechaFirma(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
        <Field label="Documento firmado (PDF)">
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
