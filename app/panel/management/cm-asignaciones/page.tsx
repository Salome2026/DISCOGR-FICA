"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { signOut } from "next-auth/react";

type Account = {
  id: string; name: string; platform: string; sello: string | null;
  assignment: { cmEmail: string } | null;
};
type Cm = { email: string; name: string };
type Launch = { id: string; artistName: string; fonogramaNombre: string; fechaLanzamiento: string | null; sello: string | null };

const STYLES = `
  .cma-root { font-family: var(--font-display); color: var(--text-1); min-height: 100vh; padding-bottom: 4rem; }
  .cma-inner { max-width: 1000px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .cma-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 12px; }
  .cma-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .cma-select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 6px; padding: 7px 10px; color: var(--text-1); font-size: 13px; }
  .cma-btn { background: transparent; border: 1px solid var(--crit-ink); color: var(--crit-ink); border-radius: 6px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; }
`;

function CmAsignacionesInner() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cms, setCms] = useState<Cm[]>([]);
  const [sinAsignar, setSinAsignar] = useState<Launch[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/management/cm-asignaciones").then((r) => r.json()).then((d) => {
      if (d.error) { setError(d.error); return; }
      setAccounts(d.accounts); setCms(d.cms);
    });
    fetch("/api/cm/lanzamientos?sinAsignar=1").then((r) => r.json()).then((d) => !d.error && setSinAsignar(d.launches));
  }
  useEffect(load, []);

  async function handleAssign(accountId: string, cmEmail: string, currentCm: string | null) {
    let reason = "";
    if (currentCm && currentCm !== cmEmail) {
      reason = window.prompt(`Transferir de ${currentCm} a ${cmEmail} — motivo:`) ?? "";
      if (!reason.trim()) return;
    }
    const res = await fetch("/api/management/cm-asignaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, cmEmail, reason }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  async function handleRevoke(accountId: string) {
    const reason = window.prompt("Motivo para quitar la asignación:") ?? "";
    if (!reason.trim()) return;
    const res = await fetch(`/api/management/cm-asignaciones/${accountId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) load();
  }

  return (
    <div className="cma-root bg-atmosphere">
      <style>{STYLES}</style>
      <div className="cma-inner">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <Link href="/panel/management" style={{ fontSize: 12.5, color: "var(--text-3)", textDecoration: "none" }}>← Management</Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 0" }}>Asignaciones de Community Manager</h1>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 6, padding: "8px 16px", color: "var(--text-2)", cursor: "pointer" }}>
            Cerrar sesión
          </button>
        </div>

        {error && <div style={{ color: "var(--crit-ink)", marginBottom: 16 }}>{error}</div>}

        {sinAsignar.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Lanzamientos sin CM asignada</div>
            {sinAsignar.map((l) => (
              <div key={l.id} className="cma-card">
                <strong>{l.fonogramaNombre}</strong> — {l.artistName}{l.sello ? ` · ${l.sello}` : ""}{l.fechaLanzamiento ? ` · ${l.fechaLanzamiento.slice(0, 10)}` : ""}
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Cuentas</div>
        {accounts.map((a) => (
          <div key={a.id} className="cma-card cma-row">
            <div>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{a.platform}{a.sello ? ` · ${a.sello}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                className="cma-select"
                value={a.assignment?.cmEmail ?? ""}
                onChange={(e) => e.target.value && handleAssign(a.id, e.target.value, a.assignment?.cmEmail ?? null)}
              >
                <option value="">Sin asignar</option>
                {cms.map((cm) => <option key={cm.email} value={cm.email}>{cm.name} ({cm.email})</option>)}
              </select>
              {a.assignment && (
                <button className="cma-btn" onClick={() => handleRevoke(a.id)}>Quitar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CmAsignacionesPage() {
  return (
    <RequireRole allow={["admin", "management"]}>
      <CmAsignacionesInner />
    </RequireRole>
  );
}
