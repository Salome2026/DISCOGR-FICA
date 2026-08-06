"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export const MANAGEMENT_STYLES = `
  .mgmt-root {
    font-family: var(--font-display);
    color: var(--text-1);
    min-height: 100vh;
    padding-bottom: 5rem;
  }
  .mgmt-watermark {
    position: fixed; top: 0; left: 0; z-index: 0;
    max-width: 50vw;
    overflow: hidden;
    font-size: clamp(48px, 6vw, 84px);
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
  .mgmt-inner { position: relative; z-index: 1; max-width: 1680px; margin: 0 auto; padding: 3rem 2.5rem 0; }
  .mgmt-topbar { display:flex; justify-content:flex-end; align-items:flex-start; gap: 16px; margin-bottom: 2rem; flex-wrap: wrap; }
  .mgmt-topbar-left { flex: 1; min-width: 0; }
  .mgmt-title { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -.02em; }
  .mgmt-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 9px 18px; color: var(--text-2); cursor: pointer; font-size: 13px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }
  .mgmt-section { margin-bottom: 2.5rem; }
  .mgmt-section-label { font-size: 13px; color: var(--text-2); text-transform: uppercase; letter-spacing: .09em; font-weight: 600; margin-bottom: 1rem; }

  .card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-xl); padding: 1.6rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
  .card-label { font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: .07em; font-weight: 500; }
`;

export function ManagementShell({
  title,
  backHref,
  children,
}: {
  title?: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mgmt-root bg-atmosphere">
      <style>{MANAGEMENT_STYLES}</style>
      <div className="mgmt-watermark" aria-hidden>MANAGEMENT</div>
      <div className="mgmt-inner">
        <div className="mgmt-topbar">
          <div className="mgmt-topbar-left">
            {backHref && (
              <Link href={backHref} style={{ color: "var(--text-3)", fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 12 }}>
                ← Volver
              </Link>
            )}
            {title && <h1 className="mgmt-title">{title}</h1>}
          </div>
          <button className="mgmt-signout" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesión
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
