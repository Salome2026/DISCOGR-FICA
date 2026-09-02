"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

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
  @media (max-width: 640px) {
    .cm-inner { padding: 1.5rem 1rem 0; }
    .cm-grid { grid-template-columns: 1fr; }
  }
`;

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
