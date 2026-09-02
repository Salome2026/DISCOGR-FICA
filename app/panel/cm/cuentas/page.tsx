"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { CmShell } from "../_shared";

type Account = {
  id: string;
  name: string;
  platform: string;
  handle: string | null;
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
        <p style={{ color: "var(--text-3)" }}>Cargando...</p>
      ) : accounts.length === 0 ? (
        <p style={{ color: "var(--text-3)" }}>Todavía no tenés cuentas asignadas.</p>
      ) : (
        <div className="cm-grid">
          {accounts.map((a) => (
            <Link key={a.id} href={`/panel/cm/cuentas/${a.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{a.name}</div>
                {a.role === "collaborator" && <span className="cm-badge">Compartida</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                {a.platform}{a.handle ? ` · ${a.handle}` : ""}{a.sello ? ` · ${a.sello}` : ""}
              </div>
              {!a.active && <span className="cm-badge">Inactiva</span>}
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
