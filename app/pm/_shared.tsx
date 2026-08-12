"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export const PM_STYLES = `
  .pmx-root { font-family: var(--font-display); color: var(--text-1); min-height: 100vh; padding-bottom: 5rem; }
  .pmx-inner { max-width: 1000px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .pmx-inner.pmx-home { max-width: 760px; }
  .pmx-topbar { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:1.75rem; flex-wrap:wrap; }
  .pmx-back { background:none; border:none; color:var(--text-3); font-size:12.5px; cursor:pointer; padding:0; margin-bottom:10px; display:inline-block; text-decoration:none; }
  .pmx-kicker { font-size:11px; color:var(--accent); letter-spacing:2px; text-transform:uppercase; margin-bottom:6px; font-weight:600; }
  .pmx-title { font-size:26px; font-weight:700; margin:0; letter-spacing:-.02em; }
  .pmx-sub { font-size:13px; color:var(--text-3); margin-top:4px; }
  .pmx-signout { background: var(--glass-bg); border:1px solid var(--glass-border); border-radius:8px; padding:8px 16px; color:var(--text-2); cursor:pointer; font-size:12.5px; backdrop-filter: blur(20px) saturate(1.7); -webkit-backdrop-filter: blur(20px) saturate(1.7); }

  .pmx-home-buttons { display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem; }
  @media (max-width:640px) { .pmx-home-buttons { grid-template-columns: 1fr; } }
  .pmx-big-btn {
    display:flex; flex-direction:column; gap:8px; align-items:flex-start; text-align:left; justify-content:center;
    min-height: 168px;
    background: var(--glass-bg); border:1px solid var(--glass-border); border-radius: var(--radius-xl);
    padding: 2rem 1.75rem; text-decoration:none; color:var(--text-1);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); cursor:pointer;
    transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .pmx-big-btn:hover { border-color: var(--accent); transform: translateY(-2px); }
  .pmx-big-btn h2 { font-size:19px; font-weight:700; margin:0; }
  .pmx-big-btn p { font-size:12.5px; color:var(--text-3); margin:0; line-height:1.5; }

  .pmx-card { background: var(--glass-bg); border:1px solid var(--glass-border); border-radius: var(--radius-lg); padding:1.5rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
`;

export function PMShell({
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
    <div className="pmx-root bg-atmosphere">
      <style>{PM_STYLES}</style>
      <div className={`pmx-inner ${homeMaxWidth ? "pmx-home" : ""}`}>
        <div className="pmx-topbar">
          <div>
            {backHref && (
              <Link href={backHref} className="pmx-back">
                ← Volver
              </Link>
            )}
            <div className="pmx-kicker">Project Managers</div>
            <h1 className="pmx-title">{title}</h1>
            <div className="pmx-sub">{subtitle ?? session?.user?.email}</div>
          </div>
          <button className="pmx-signout" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesión
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
