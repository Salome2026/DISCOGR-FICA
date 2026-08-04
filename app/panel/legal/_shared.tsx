"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export const ESTADO_BADGE: Record<string, { bg: string; ink: string }> = {
  Vigente: { bg: "var(--good-bg)", ink: "var(--good-ink)" },
  Vencido: { bg: "var(--crit-bg)", ink: "var(--crit-ink)" },
  "En negociación": { bg: "rgba(217,164,65,.16)", ink: "var(--warn-ink)" },
  Rescindido: { bg: "var(--bg-2)", ink: "var(--text-3)" },
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
  .legal-big-btn {
    display: flex; flex-direction: column; gap: 8px; align-items: flex-start; text-align: left;
    background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
    padding: 1.75rem; text-decoration: none; color: var(--text-1);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7);
    box-shadow: var(--shadow-glass); cursor: pointer;
    transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .legal-big-btn:hover { border-color: var(--legal-accent); transform: translateY(-2px); }
  .legal-big-btn .icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 19px; background: linear-gradient(155deg, var(--legal-accent), #a3854f); color: var(--legal-accent-ink); }
  .legal-big-btn h2 { font-size: 17px; font-weight: 700; margin: 0; }
  .legal-big-btn p { font-size: 12.5px; color: var(--text-3); margin: 0; line-height: 1.5; }
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
