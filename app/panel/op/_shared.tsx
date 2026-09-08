"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

// Módulo OP — mismo esqueleto que PublishingShell/CmShell (own module, own
// styles), pero con un contenedor mucho más ancho (1680px, el máximo ya
// usado en booking/management) porque acá el contenido son tablas densas,
// no tarjetas.
export const OP_STYLES = `
  .op-root {
    font-family: var(--font-display);
    color: var(--text-1);
    min-height: 100vh;
    padding-bottom: 5rem;
  }
  .op-watermark {
    position: fixed; top: 0; left: 0; z-index: 0;
    max-width: 50vw;
    overflow: hidden;
    font-size: clamp(36px, 4.5vw, 64px);
    font-weight: 800;
    letter-spacing: -.02em;
    line-height: 1;
    white-space: nowrap;
    color: var(--text-1);
    opacity: 0.05;
    transform: translate(-2%, -10%);
    pointer-events: none;
    user-select: none;
  }
  .op-inner { position: relative; z-index: 1; max-width: 1680px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .op-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 1.75rem; flex-wrap: wrap; }
  .op-back { background: none; border: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; padding: 0; margin-bottom: 10px; display: inline-block; text-decoration: none; }
  .op-kicker { font-size: 11px; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
  .op-title { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -.02em; }
  .op-sub { font-size: 13px; color: var(--text-3); margin-top: 4px; }
  .op-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 16px; color: var(--text-2); cursor: pointer; font-size: 12.5px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }
  .op-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.5rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }

  .op-home-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
  .op-big-btn {
    display: flex; flex-direction: column; gap: 10px; align-items: flex-start; text-align: left;
    background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
    padding: 1.75rem 1.5rem; text-decoration: none; color: var(--text-1); min-height: 130px;
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
  }
  .op-big-btn:hover { border-color: var(--accent); transform: translateY(-2px); }
  .op-big-btn h2 { font-size: 18px; font-weight: 700; margin: 0; }
  .op-big-btn p { font-size: 12.5px; color: var(--text-3); margin: 0; line-height: 1.5; }

  .op-field-label { font-size:12.5px; color:var(--text-2); margin-bottom:6px; display:block; font-weight:600; }
  .op-input { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; color:var(--text-1); font-size:13.5px; }
`;

export function OpShell({
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
    <div className="op-root bg-atmosphere">
      <style>{OP_STYLES}</style>
      <div className="op-watermark" aria-hidden>OPERACIONES DIGITALES</div>
      <div className={`op-inner${homeMaxWidth ? " op-home" : ""}`}>
        <div className="op-topbar">
          <div>
            {backHref && (
              <Link href={backHref} className="op-back">
                ← Volver
              </Link>
            )}
            <div className="op-kicker">Módulo independiente · OP</div>
            <h1 className="op-title">{title}</h1>
            <div className="op-sub">{subtitle ?? session?.user?.email}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/cuenta" className="op-signout" style={{ textDecoration: "none" }}>
              Mi cuenta
            </Link>
            <button className="op-signout" onClick={() => signOut({ callbackUrl: "/" })}>
              Cerrar sesión
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// Overlay de modal reusado por cada pantalla de OP para su propio
// formulario de alta/edición (mismo patrón que ResponseModal/ContactModal
// en el resto del proyecto — no hay ningún <Dialog> genérico en el código).
export function OpModal({ onClose, children, width = 480 }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
      onClick={onClose}
    >
      <div className="op-card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, width, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

export function OpHistorySection({ history }: { history: { id: number; email: string; action: string; at: string; cambios: { campo: string; valorAnterior: unknown; valorNuevo: unknown }[] }[] | null }) {
  if (history === null) return <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Cargando historial...</div>;
  if (history.length === 0) return <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Sin cambios registrados todavía.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {history.map((h) => (
        <div key={h.id} style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: 8 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {h.email} — {new Date(h.at).toLocaleString("es-AR")}
          </div>
          {h.cambios.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{h.action}</div>
          ) : (
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
              {h.cambios.map((c, i) => (
                <div key={i} style={{ fontSize: 12 }}>
                  <strong>{c.campo}</strong>: {String(c.valorAnterior ?? "—")} → {String(c.valorNuevo ?? "—")}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
