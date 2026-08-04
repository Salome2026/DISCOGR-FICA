"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import RequireRole from "@/app/components/RequireRole";
import { SELLOS } from "@/lib/sellos";
import { normalizeName } from "@/lib/participants";
import { TIPOS_CONTRATO, ESTADOS_CONTRATO, type LegalContract } from "@/lib/db/legalContracts";

type CatalogTrack = {
  id: string;
  track: string;
  release_date: string | null;
  company: string | null;
  artist_display: string;
  sello: string | null;
};

type Acuerdo = {
  id: string;
  nombre: string;
  compania: string | null;
  estado: string[];
};

const ESTADO_BADGE: Record<string, { bg: string; ink: string }> = {
  Vigente: { bg: "var(--good-bg)", ink: "var(--good-ink)" },
  Vencido: { bg: "var(--crit-bg)", ink: "var(--crit-ink)" },
  "En negociación": { bg: "rgba(217,164,65,.16)", ink: "var(--warn-ink)" },
  Rescindido: { bg: "var(--bg-2)", ink: "var(--text-3)" },
  Firmado: { bg: "var(--good-bg)", ink: "var(--good-ink)" },
  Contactado: { bg: "rgba(217,164,65,.16)", ink: "var(--warn-ink)" },
  "NO SACAR": { bg: "var(--crit-bg)", ink: "var(--crit-ink)" },
};

function Badge({ label }: { label: string }) {
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

export default function LegalPanelPage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalPanel />
    </RequireRole>
  );
}

function LegalPanel() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"contratos" | "releases">("contratos");

  return (
    <div className="legal-root bg-atmosphere">
      <style>{`
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
        .legal-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 1.75rem; flex-wrap: wrap; }
        .legal-kicker { font-size: 11px; color: var(--legal-accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
        .legal-title { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -.02em; }
        .legal-sub { font-size: 13px; color: var(--text-3); margin-top: 4px; }
        .legal-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 16px; color: var(--text-2); cursor: pointer; font-size: 12.5px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }
        .legal-tabs { display: flex; gap: 8px; margin-bottom: 1.25rem; }
        .legal-tab { background: transparent; border: 1px solid var(--line-soft); border-radius: 100px; padding: 8px 18px; color: var(--text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
        .legal-tab.active { background: linear-gradient(155deg, var(--legal-accent), #a3854f); color: var(--legal-accent-ink); border-color: transparent; }
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
      `}</style>

      <div className="legal-inner">
        <div className="legal-topbar">
          <div>
            <div className="legal-kicker">Módulo independiente · Solo equipo legal</div>
            <h1 className="legal-title">Panel de Legales</h1>
            <div className="legal-sub">{session?.user?.email} — contratos y estado de releases de los artistas.</div>
          </div>
          <button className="legal-signout" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesión
          </button>
        </div>

        <div className="legal-tabs">
          <button className={`legal-tab ${tab === "contratos" ? "active" : ""}`} onClick={() => setTab("contratos")}>
            Contratos
          </button>
          <button className={`legal-tab ${tab === "releases" ? "active" : ""}`} onClick={() => setTab("releases")}>
            Releases de fonogramas
          </button>
        </div>

        {tab === "contratos" ? <ContratosTab /> : <ReleasesTab />}
      </div>
    </div>
  );
}

function isVencido(fechaVencimiento: string | null): boolean {
  if (!fechaVencimiento) return false;
  return new Date(fechaVencimiento) < new Date(new Date().toDateString());
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
              <th>Artista</th>
              <th>Tipo</th>
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
                <td>{c.artist}</td>
                <td className="muted">{c.tipoContrato}</td>
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
                <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>
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
          artist, sello: sello || null, tipoContrato, fechaFirma: fechaFirma || null,
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
        <Field label="Sello">
          <select value={sello} onChange={(e) => setSello(e.target.value)} style={inputStyle}>
            <option value="">Sin asignar</option>
            {SELLOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Tipo de contrato">
          <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)} style={inputStyle}>
            {TIPOS_CONTRATO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
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

function ReleasesTab() {
  const [tracks, setTracks] = useState<CatalogTrack[] | null>(null);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/legal/releases")
      .then((r) => r.json())
      .then((d) => !d.error && setTracks(d.tracks))
      .catch((e) => setError(String(e)));
    fetch("/api/acuerdos")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setAcuerdos(d.acuerdos)))
      .catch((e) => setError(String(e)));
  }, []);

  const acuerdoByArtist = useMemo(() => {
    const map = new Map<string, Acuerdo>();
    for (const a of acuerdos ?? []) map.set(normalizeName(a.nombre), a);
    return map;
  }, [acuerdos]);

  const visible = (tracks ?? []).filter((t) => t.artist_display.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="legal-card">
      <div className="legal-toolbar">
        <input className="legal-search" placeholder="Buscar por artista..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {!tracks ? (
        <p className="muted">Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fonograma</th>
              <th>Artista(s)</th>
              <th>Sello</th>
              <th>Fecha</th>
              <th>Estado del acuerdo</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const names = t.artist_display.split("|").map((s) => s.trim());
              const acuerdo = names.map((n) => acuerdoByArtist.get(normalizeName(n))).find(Boolean);
              return (
                <tr key={t.id}>
                  <td>{t.track}</td>
                  <td className="muted">{names.join(", ")}</td>
                  <td className="muted">{t.sello ?? t.company ?? "—"}</td>
                  <td className="muted">{t.release_date ?? "—"}</td>
                  <td>
                    {acuerdo && acuerdo.estado.length > 0 ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {acuerdo.estado.map((e) => <Badge key={e} label={e} />)}
                      </div>
                    ) : (
                      <span className="muted">Sin acuerdo registrado</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>{label}</label>
      {children}
    </div>
  );
}

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
