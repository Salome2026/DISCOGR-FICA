"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export const MANAGEMENT_STYLES = `
  .mgmt-root {
    font-family: var(--font-display);
    color: var(--text-1);
    min-height: 100vh;
    padding-bottom: 5rem;
  }
  .mgmt-brandmark {
    position: fixed; top: 0; left: 0; z-index: 1;
    padding: 2.5rem 2rem;
    font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--text-3);
    pointer-events: none;
  }
  .mgmt-inner { max-width: 1680px; margin: 0 auto; padding: 7rem 2.5rem 0; }
  .mgmt-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; margin-bottom: 2rem; flex-wrap: wrap; }
  .mgmt-kicker { font-size: 11px; color: var(--text-3); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
  .mgmt-title { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -.02em; }
  .mgmt-sub { font-size: 14px; color: var(--text-3); margin-top: 6px; }
  .mgmt-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 9px 18px; color: var(--text-2); cursor: pointer; font-size: 13px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }
  .mgmt-section { margin-bottom: 2.5rem; }
  .mgmt-section-label { font-size: 13px; color: var(--text-2); text-transform: uppercase; letter-spacing: .09em; font-weight: 600; margin-bottom: 1rem; }

  .card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-xl); padding: 1.6rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
  .card-label { font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: .07em; font-weight: 500; }
`;

export function ManagementShell({
  title,
  subtitle,
  backHref,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  return (
    <div className="mgmt-root bg-atmosphere">
      <style>{MANAGEMENT_STYLES}</style>
      <div className="mgmt-brandmark" aria-hidden>Management</div>
      <div className="mgmt-inner">
        <div className="mgmt-topbar">
          <div>
            {backHref && (
              <Link href={backHref} style={{ color: "var(--text-3)", fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 12 }}>
                ← Volver
              </Link>
            )}
            <div className="mgmt-kicker">Módulo independiente · Solo equipo de Management</div>
            <h1 className="mgmt-title">{title}</h1>
            <div className="mgmt-sub">{subtitle ?? session?.user?.email}</div>
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
