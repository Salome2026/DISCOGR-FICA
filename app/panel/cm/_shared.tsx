"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CM_TIPOS_CONTENIDO, CM_ESTADOS, CM_PLATAFORMAS } from "@/lib/db/cmContent";

// Diseño pedido explícitamente para este módulo: serio, corporativo,
// minimalista, blanco y negro, sin el efecto "glass"/watermark decorativo
// que usan otros paneles — cuadros planos, bordes finos, cero blur.
export const CM_STYLES = `
  .cm-root { font-family: var(--font-display); color: var(--text-1); min-height: 100vh; padding-bottom: 4rem; background: var(--bg-1); }
  .cm-inner { max-width: 1100px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .cm-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 1.75rem; flex-wrap: wrap; }
  .cm-title { font-size: 25px; font-weight: 700; margin: 0; letter-spacing: -.01em; }
  .cm-subtitle { font-size: 14px; font-weight: 500; color: var(--text-2); margin-top: 4px; }
  .cm-signout { background: transparent; border: 1px solid var(--line-soft); border-radius: 6px; padding: 8px 16px; color: var(--text-1); font-weight: 500; cursor: pointer; font-size: 13px; }
  .cm-nav { display: flex; gap: 4px; margin-bottom: 1.75rem; border-bottom: 1px solid var(--line-soft); flex-wrap: wrap; }
  .cm-nav a { padding: 10px 14px; font-size: 14px; font-weight: 500; color: var(--text-2); text-decoration: none; border-bottom: 2px solid transparent; }
  .cm-nav a.active { color: var(--text-1); font-weight: 700; border-bottom-color: var(--text-1); }
  .cm-card { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 10px; padding: 1.25rem; }
  .cm-section { margin-bottom: 1.75rem; }
  .cm-section-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; color: var(--text-1); }
  .cm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .cm-empty { font-size: 14px; font-weight: 500; color: var(--text-2); }
  .cm-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 3px 10px; border-radius: 100px; background: var(--bg-2); border: 1px solid var(--line-soft); color: var(--text-2); }
  .cm-badge.ok { background: var(--good-bg); color: var(--good-ink); border-color: transparent; }
  .cm-badge.warn { background: var(--warn-bg); color: var(--warn-ink); border-color: transparent; }
  .cm-badge.crit { background: var(--crit-bg); color: var(--crit-ink); border-color: transparent; }
  .cm-btn { background: var(--text-1); color: var(--bg-1); border: none; border-radius: 6px; padding: 9px 18px; font-weight: 700; font-size: 14px; cursor: pointer; }
  .cm-btn:hover { filter: brightness(0.92); }
  .cm-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 6px; padding: 9px 18px; color: var(--text-1); font-weight: 600; font-size: 14px; cursor: pointer; }
  .cm-btn-ghost:hover { border-color: var(--text-2); }
  .cm-input { width: 100%; background: var(--bg-1); border: 1px solid var(--line-soft); border-radius: 6px; padding: 9px 12px; color: var(--text-1); font-size: 14px; }
  .cm-label { font-size: 13px; font-weight: 600; color: var(--text-2); display: block; margin-bottom: 4px; }
  .cm-avatar { border-radius: 999px; object-fit: cover; background: var(--bg-2); border: 1px solid var(--line-soft); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-2); flex-shrink: 0; }
  .cm-filter-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .cm-filter-row select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 6px; padding: 7px 10px; color: var(--text-1); font-size: 13px; font-weight: 500; }
  .cm-dual-calendar { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  @media (max-width: 900px) {
    .cm-dual-calendar { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .cm-inner { padding: 1.5rem 1rem 0; }
    .cm-grid { grid-template-columns: 1fr; }
  }
`;

// Color determinístico por cuenta (mismo criterio que selloColor() en
// ReleaseCalendar.tsx, pero con hash en vez de mapa fijo — a diferencia de
// los sellos, las cuentas de CM son dinámicas, no una lista chica conocida).
const ACCOUNT_COLOR_PALETTE = ["#3fc6d1", "#8b93e8", "#e8a1c4", "#e0b975", "#8fd0a0", "#c98fd0", "#d0a08f", "#8fb8d0"];
export function accountColor(accountId: string): string {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) hash = (hash * 31 + accountId.charCodeAt(i)) >>> 0;
  return ACCOUNT_COLOR_PALETTE[hash % ACCOUNT_COLOR_PALETTE.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function CmAvatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      width={size}
      height={size}
      className="cm-avatar"
      style={{ width: size, height: size }}
    />
  ) : (
    <div className="cm-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initialsOf(name)}
    </div>
  );
}

// Shape devuelto por GET /api/cm/contenidos — mirror cliente de CmContentItem
// (lib/db/cmContent.ts), exportado acá para que todas las pantallas de CM
// usen el mismo tipo en vez de recortes locales duplicados.
export type CmContentListItem = {
  id: number;
  accountId: string;
  artistName: string | null;
  tipoContenido: string;
  titulo: string | null;
  plataforma: string | null;
  fecha: string;
  hora: string | null;
  copyText: string | null;
  assetsUrl: string | null;
  estado: string;
};

export type CmAccountLite = { id: string; name: string; platform: string };

// Modal único de alta/edición de un contenido — reemplaza los 3 modales
// duplicados que existían antes (ContentDetailModal, NewContentModal en
// calendario/page.tsx; TaskDetailModal en page.tsx), todos sobre la misma
// tabla cm_content_items. `item` null = modo alta (con fecha/cuenta
// precargadas); `item` con valor = modo edición/reprogramación.
export function ContentItemModal({
  item,
  accounts,
  defaultFecha,
  defaultAccountId,
  onClose,
  onChanged,
}: {
  item: CmContentListItem | null;
  accounts: CmAccountLite[];
  defaultFecha?: string;
  defaultAccountId?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const isEdit = !!item;
  const [accountId, setAccountId] = useState(item?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? "");
  const [tipoContenido, setTipoContenido] = useState<string>(item?.tipoContenido ?? CM_TIPOS_CONTENIDO[0]);
  const [titulo, setTitulo] = useState(item?.titulo ?? "");
  const [plataforma, setPlataforma] = useState(item?.plataforma ?? accounts.find((a) => a.id === (item?.accountId ?? defaultAccountId))?.platform ?? "");
  const [fecha, setFecha] = useState(item?.fecha?.slice(0, 10) ?? defaultFecha ?? "");
  const [hora, setHora] = useState(item?.hora ?? "");
  const [estado, setEstado] = useState(item?.estado ?? "idea");
  const [assetsUrl, setAssetsUrl] = useState(item?.assetsUrl ?? "");
  const [copyText, setCopyText] = useState(item?.copyText ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onAccountChange(id: string) {
    setAccountId(id);
    // Sugiere la plataforma de la cuenta elegida, pero queda editable aparte
    // — un contenido puede publicarse en una plataforma distinta a la
    // declarada en la cuenta (pedido explícito).
    if (!plataforma) {
      const acc = accounts.find((a) => a.id === id);
      if (acc?.platform) setPlataforma(acc.platform);
    }
  }

  async function handleSave() {
    if (!accountId) { setError("Elegí una cuenta."); return; }
    if (!fecha) { setError("Elegí una fecha."); return; }
    setSaving(true);
    setError(null);
    try {
      const body = {
        accountId,
        tipoContenido,
        titulo: titulo.trim() || null,
        plataforma: plataforma || null,
        fecha,
        hora: hora || null,
        estado,
        assetsUrl: assetsUrl.trim() || null,
        copyText: copyText.trim() || null,
      };
      const res = await fetch(isEdit ? `/api/cm/contenidos/${item!.id}` : "/api/cm/contenidos", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm("¿Eliminar este contenido?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cm/contenidos/${item.id}`, { method: "DELETE" });
      if (res.ok) onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="cm-card" onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? "Editar contenido" : "Nuevo contenido"}</div>
        {accounts.length === 0 ? (
          <p className="cm-empty">No tenés cuentas asignadas todavía.</p>
        ) : (
          <>
            <div>
              <label className="cm-label">Cuenta / artista</label>
              <select className="cm-input" value={accountId} onChange={(e) => onAccountChange(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="cm-label">Título</label>
              <input className="cm-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Reel anuncio de fecha de lanzamiento" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Tipo</label>
                <select className="cm-input" value={tipoContenido} onChange={(e) => setTipoContenido(e.target.value)}>
                  {CM_TIPOS_CONTENIDO.map((t) => <option key={t} value={t}>{CM_TIPO_LABELS[t] ?? t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Plataforma</label>
                <select className="cm-input" value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
                  <option value="">Elegir...</option>
                  {CM_PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Fecha</label>
                <input type="date" className="cm-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Hora (opcional)</label>
                <input type="time" className="cm-input" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Estado</label>
                <select className="cm-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  {CM_ESTADOS.map((s) => <option key={s} value={s}>{CM_ESTADO_LABELS[s] ?? s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="cm-label">Link de assets (opcional)</label>
              <input className="cm-input" value={assetsUrl} onChange={(e) => setAssetsUrl(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div>
              <label className="cm-label">Comentarios u observaciones (opcional)</label>
              <textarea className="cm-input" rows={3} value={copyText} onChange={(e) => setCopyText(e.target.value)} style={{ resize: "vertical" }} />
            </div>
          </>
        )}
        {error && <div className="cm-badge crit">{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
          {isEdit ? (
            <button type="button" className="cm-btn-ghost" style={{ borderColor: "var(--crit-ink)", color: "var(--crit-ink)" }} disabled={deleting} onClick={handleDelete}>
              {deleting ? "..." : "Eliminar"}
            </button>
          ) : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="cm-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="cm-btn" disabled={saving || accounts.length === 0} onClick={handleSave}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CmShell({
  title,
  subtitle,
  active,
  children,
}: {
  title?: string;
  subtitle?: string;
  active?: "home" | "cuentas" | "calendario" | "lanzamientos";
  children: React.ReactNode;
}) {
  return (
    <div className="cm-root">
      <style>{CM_STYLES}</style>
      <div className="cm-inner">
        <div className="cm-topbar">
          <div>
            {title && <h1 className="cm-title">{title}</h1>}
            {subtitle && <div className="cm-subtitle">{subtitle}</div>}
          </div>
          <button className="cm-signout" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesión
          </button>
        </div>
        <nav className="cm-nav">
          <Link href="/panel/cm" className={active === "home" ? "active" : ""}>Portada</Link>
          <Link href="/panel/cm/cuentas" className={active === "cuentas" ? "active" : ""}>Cuentas</Link>
          <Link href="/panel/cm/lanzamientos" className={active === "lanzamientos" ? "active" : ""}>Lanzamientos</Link>
        </nav>
        {children}
      </div>
    </div>
  );
}

export const CM_TIPO_LABELS: Record<string, string> = {
  reel: "Reel", historia: "Historia", tiktok: "TikTok", short: "Short", post: "Post", anuncio: "Anuncio", recordatorio: "Recordatorio",
};

export const CM_ESTADO_LABELS: Record<string, string> = {
  idea: "Idea", pendiente_material: "Pendiente de material", en_produccion: "En producción",
  listo: "Listo", programado: "Programado", publicado: "Publicado", cancelado: "Cancelado",
};

export const CM_MATERIALES_LABELS: Record<string, string> = {
  assets_disponibles: "Materiales completos", video_disponible: "Video disponible", informacion_parcial: "Información parcial",
  assets_pendientes: "Falta la carpeta de assets", video_pendiente: "Falta el video de YouTube", sin_materiales: "Sin materiales cargados",
};
