"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CmAvatar } from "../_shared";

type Account = {
  id: string;
  name: string;
  platform: string;
  handle: string | null;
  photoUrl: string | null;
  sello: string | null;
  active: boolean;
  role?: "owner" | "collaborator";
};

function CmCuentasInner() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cm/cuentas")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setAccounts(d.accounts)));
  }, []);

  return (
    <CmShell title="Cuentas" subtitle="Marcas, artistas, sellos y canales asignados" active="cuentas">
      {error && <div className="cm-badge crit" style={{ marginBottom: 16 }}>{error}</div>}
      {!accounts ? (
        <p className="cm-empty">Cargando...</p>
      ) : accounts.length === 0 ? (
        <p className="cm-empty">Todavía no tenés cuentas asignadas.</p>
      ) : (
        <div className="cm-grid">
          {accounts.map((a) => (
            <Link key={a.id} href={`/panel/cm/cuentas/${a.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)", display: "flex", alignItems: "center", gap: 12 }}>
              <CmAvatar name={a.name} photoUrl={a.photoUrl} size={44} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                  {a.role === "collaborator" && <span className="cm-badge">Compartida</span>}
                  {!a.active && <span className="cm-badge">Inactiva</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
                  {a.platform}{a.handle ? ` · ${a.handle}` : ""}{a.sello ? ` · ${a.sello}` : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CmShell>
  );
}

export default function CmCuentasPage() {
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <CmCuentasInner />
    </RequireRole>
  );
}
