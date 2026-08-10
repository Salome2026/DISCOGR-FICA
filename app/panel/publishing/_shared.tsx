"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { SELLOS } from "@/lib/sellos";
import { TIPOS_ARTISTA_PUBLISHING, type PublishingArtist } from "@/lib/db/publishingArtists";

export const PUBLISHING_STYLES = `
  .pub-root {
    --pub-accent: var(--accent);
    --pub-accent-ink: var(--accent-ink);
    font-family: var(--font-display);
    color: var(--text-1);
    min-height: 100vh;
    padding-bottom: 5rem;
  }
  .pub-inner { max-width: 1180px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .pub-inner.pub-home { max-width: 980px; }
  .pub-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 1.75rem; flex-wrap: wrap; }
  .pub-back { background: none; border: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; padding: 0; margin-bottom: 10px; display: inline-block; text-decoration: none; }
  .pub-kicker { font-size: 11px; color: var(--pub-accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
  .pub-title { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -.02em; }
  .pub-sub { font-size: 13px; color: var(--text-3); margin-top: 4px; }
  .pub-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 16px; color: var(--text-2); cursor: pointer; font-size: 12.5px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }
  .pub-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.5rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
  .pub-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .pub-search { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 12px; color: var(--text-1); font-size: 13px; min-width: 240px; }
  .pub-btn-primary { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 10px 18px; color: var(--pub-accent-ink); font-weight: 700; cursor: pointer; font-size: 13.5px; }
  .pub-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 6px 12px; color: var(--text-2); cursor: pointer; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; color: var(--text-3); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
  td { padding: 8px 10px; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
  .pub-doc-link { color: var(--pub-accent); text-decoration: none; font-size: 12px; }
  .muted { color: var(--text-3); }

  .pub-home-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  @media (max-width: 640px) { .pub-home-buttons { grid-template-columns: 1fr; } }
  .pub-big-btn {
    display: flex; flex-direction: column; gap: 8px; align-items: flex-start; text-align: left;
    background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
    padding: 1.75rem; text-decoration: none; color: var(--text-1);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); cursor: pointer;
    transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .pub-big-btn:hover { border-color: var(--pub-accent); transform: translateY(-2px); }
  .pub-big-btn h2 { font-size: 17px; font-weight: 700; margin: 0; }
  .pub-big-btn p { font-size: 12.5px; color: var(--text-3); margin: 0; line-height: 1.5; }

  .pub-artist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
  .pub-artist-card {
    aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg);
    text-decoration: none; color: var(--text-1); padding: 1rem; text-align: center;
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .pub-artist-card:hover { border-color: var(--pub-accent); transform: translateY(-2px); }
  .pub-artist-avatar {
    width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 700; background: var(--accent-gradient); color: var(--pub-accent-ink);
  }
  .pub-artist-name { font-size: 13px; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .pub-artist-meta { font-size: 10.5px; color: var(--text-3); }
  .pub-artist-tag { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; padding: 1px 8px; border-radius: 100px; }
  .pub-artist-tag.propio { background: var(--good-bg); color: var(--good-ink); }
  .pub-artist-tag.externo { background: var(--bg-2); color: var(--text-3); }

  .card-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: .07em; font-weight: 500; }
  .kpi-chip { font-size: 10px; padding: 2px 7px; border-radius: 100px; font-weight: 600; }
`;

export function PublishingShell({
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
    <div className="pub-root bg-atmosphere">
      <style>{PUBLISHING_STYLES}</style>
      <div className={`pub-inner ${homeMaxWidth ? "pub-home" : ""}`}>
        <div className="pub-topbar">
          <div>
            {backHref && (
              <Link href={backHref} className="pub-back">
                ← Volver
              </Link>
            )}
            <div className="pub-kicker">Módulo independiente · Tango Made In Argentina Publishing</div>
            <h1 className="pub-title">{title}</h1>
            <div className="pub-sub">{subtitle ?? session?.user?.email}</div>
          </div>
          <button className="pub-signout" onClick={() => signOut({ callbackUrl: "/" })}>
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

export function ArtistForm({
  artist,
  onClose,
  onSaved,
}: {
  artist: PublishingArtist | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombreArtistico, setNombreArtistico] = useState(artist?.nombreArtistico ?? "");
  const [nombreCompleto, setNombreCompleto] = useState(artist?.nombreCompleto ?? "");
  const [apellido, setApellido] = useState(artist?.apellido ?? "");
  const [dni, setDni] = useState(artist?.dni ?? "");
  const [cuil, setCuil] = useState(artist?.cuil ?? "");
  const [sadaic, setSadaic] = useState(artist?.sadaic ?? "");
  const [direccion, setDireccion] = useState(artist?.direccion ?? "");
  const [localidad, setLocalidad] = useState(artist?.localidad ?? "");
  const [provincia, setProvincia] = useState(artist?.provincia ?? "");
  const [nacionalidad, setNacionalidad] = useState(artist?.nacionalidad ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(artist?.fechaNacimiento ?? "");
  const [email, setEmail] = useState(artist?.email ?? "");
  const [telefono, setTelefono] = useState(artist?.telefono ?? "");
  const [sello, setSello] = useState(artist?.sello ?? "");
  const [tipo, setTipo] = useState(artist?.tipo ?? "Propio");
  const [observaciones, setObservaciones] = useState(artist?.observaciones ?? "");
  const [documentoUrl, setDocumentoUrl] = useState(artist?.documentoUrl ?? "");
  const [documentoNombre, setDocumentoNombre] = useState(artist?.documentoNombre ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/publishing/upload" });
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
      const url = artist ? `/api/publishing/artists/${artist.id}` : "/api/publishing/artists";
      const method = artist ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreArtistico, nombreCompleto: nombreCompleto || null, apellido: apellido || null,
          dni: dni || null, cuil: cuil || null, sadaic: sadaic || null, direccion: direccion || null,
          localidad: localidad || null, provincia: provincia || null,
          nacionalidad: nacionalidad || null, fechaNacimiento: fechaNacimiento || null,
          email: email || null, telefono: telefono || null, sello: sello || null, tipo,
          observaciones: observaciones || null, documentoUrl: documentoUrl || null,
          documentoNombre: documentoNombre || null,
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
        style={{ background: "var(--glass-bg-strong)", backdropFilter: "blur(40px) saturate(1.7)", WebkitBackdropFilter: "blur(40px) saturate(1.7)", color: "var(--text-1)", borderRadius: 16, border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-glass-lg)", width: "100%", maxWidth: 520, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>{artist ? "Editar artista" : "Nuevo artista"}</div>

        <Field label="Nombre artístico">
          <input value={nombreArtistico} onChange={(e) => setNombreArtistico(e.target.value)} required style={inputStyle} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Nombre completo"><input value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Apellido"><input value={apellido} onChange={(e) => setApellido(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="DNI"><input value={dni} onChange={(e) => setDni(e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Número de SADAIC"><input value={sadaic} onChange={(e) => setSadaic(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
        <Field label="CUIL">
          <input value={cuil} onChange={(e) => setCuil(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Dirección">
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Localidad"><input value={localidad} onChange={(e) => setLocalidad(e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Provincia"><input value={provincia} onChange={(e) => setProvincia(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Nacionalidad"><input value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Fecha de nacimiento"><input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Correo electrónico"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Teléfono"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
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
            <Field label="Tipo de artista">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
                {TIPOS_ARTISTA_PUBLISHING.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <Field label="Documentación adjunta (PDF o imagen, opcional)">
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            style={{ ...inputStyle, padding: "6px 8px" }}
          />
          {uploading && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>Subiendo...</div>}
          {documentoNombre && !uploading && <div style={{ fontSize: 11.5, color: "var(--good-ink)", marginTop: 4 }}>✓ {documentoNombre}</div>}
        </Field>
        <Field label="Observaciones">
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        {error && <div style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} className="pub-btn-primary">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
