"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { ROLES_BY_ACCOUNT_TYPE, type AccountType, type Role } from "@/lib/permissions";

type AppUser = {
  email: string;
  name: string;
  account_type: AccountType;
  role: Role;
  active: boolean;
  last_login: string | null;
};

export default function AdminUsuarios() {
  return (
    <RequireRole allow={["admin"]}>
      <AdminUsuariosInner />
    </RequireRole>
  );
}

function AdminUsuariosInner() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setUsers(d.users)))
      .catch((e) => setError(String(e)));
  }

  useEffect(load, []);

  async function toggleActive(u: AppUser) {
    await fetch(`/api/admin/users/${encodeURIComponent(u.email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_active", active: !u.active }),
    });
    load();
  }

  async function forceLogout(u: AppUser) {
    await fetch(`/api/admin/users/${encodeURIComponent(u.email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "force_logout" }),
    });
    load();
  }

  async function changeRole(u: AppUser, role: Role) {
    await fetch(`/api/admin/users/${encodeURIComponent(u.email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_role", role, extraPermissions: [], revokedPermissions: [] }),
    });
    load();
  }

  async function resetPassword(u: AppUser) {
    const pw = prompt(`Nueva contraseña temporal para ${u.email} (mínimo 8 caracteres):`);
    if (!pw) return;
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password", password: pw }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else alert("Contraseña actualizada.");
  }

  return (
    <div className="dash-root">
      <style>{`
        .dash-root {
          --bg-0:#2a241c; --bg-0b:#3a3226; --bg-1:#332c22; --bg-2:#3d3427;
          --line:#544831; --line-soft:#403627;
          --text-1:#f4ede1; --text-2:#c2b39a; --text-3:#8f8267;
          --gold:#e6a94f;
          font-family:-apple-system,"SF Pro Display",ui-sans-serif,"Segoe UI",Helvetica,Arial,sans-serif;
          background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-0b) 55%,var(--bg-0) 100%);
          color:var(--text-1);
          min-height:100vh;
          padding-bottom:5rem;
        }
        .inner{max-width:1000px;margin:0 auto;padding:2.5rem 2rem 0;}
        .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
        .crumb a{color:var(--text-2);text-decoration:none;}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;}
        .btn-primary{background:var(--gold);border:none;border-radius:8px;padding:10px 18px;color:#3a2b0f;font-weight:600;cursor:pointer;font-size:13.5px;}
        .btn-ghost{background:transparent;border:1px solid var(--line-soft);border-radius:8px;padding:6px 12px;color:var(--text-2);cursor:pointer;font-size:12px;}
        .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        select{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:6px;padding:4px 8px;color:var(--text-1);font-size:12px;}
        .pill{font-size:11px;padding:2px 8px;border-radius:100px;font-weight:600;}
      `}</style>
      <div className="inner">
        <div className="crumb">
          <Link href="/dashboard">Dashboard</Link> › Usuarios
        </div>
        <div className="topbar">
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Usuarios</h1>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Nuevo usuario
          </button>
        </div>

        {error && (
          <div style={{ background: "#3d2a24", color: "#eab3a8", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="card">
          {!users ? (
            <p style={{ color: "var(--text-3)" }}>Cargando...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Rol</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.account_type}</td>
                    <td>
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}>
                        {(u.account_type === "empresa" ? ROLES_BY_ACCOUNT_TYPE.empresa : ROLES_BY_ACCOUNT_TYPE.artista).map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td>{u.last_login ? new Date(u.last_login).toLocaleString("es-AR") : "Nunca"}</td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          background: u.active ? "#3a4032" : "#3d2a24",
                          color: u.active ? "#d3e6c9" : "#eab3a8",
                        }}
                      >
                        {u.active ? "Activo" : "Desactivado"}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn-ghost" onClick={() => toggleActive(u)}>
                        {u.active ? "Desactivar" : "Activar"}
                      </button>
                      <button className="btn-ghost" onClick={() => resetPassword(u)}>
                        Reset pass
                      </button>
                      <button className="btn-ghost" onClick={() => forceLogout(u)}>
                        Forzar logout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateUserForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("empresa");
  const [role, setRole] = useState<Role>("project_manager");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableRoles = ROLES_BY_ACCOUNT_TYPE[accountType];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, accountType, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ background: "#1c1712", color: "#f4ede1", borderRadius: 16, border: "1px solid #403627", width: "100%", maxWidth: 420, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>Nuevo usuario</div>
        <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} /></Field>
        <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} /></Field>
        <Field label="Contraseña temporal"><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} /></Field>
        <Field label="Tipo de cuenta">
          <select
            value={accountType}
            onChange={(e) => {
              const at = e.target.value as AccountType;
              setAccountType(at);
              setRole(ROLES_BY_ACCOUNT_TYPE[at][0]);
            }}
            style={inputStyle}
          >
            <option value="empresa">Empresa</option>
            <option value="artista">Artista</option>
          </select>
        </Field>
        <Field label="Rol">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={inputStyle}>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        {error && <div style={{ color: "#eab3a8", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid #403627", borderRadius: 8, padding: "8px 16px", color: "#c2b39a", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ background: "#e6a94f", border: "none", borderRadius: 8, padding: "8px 16px", color: "#3a2b0f", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            {saving ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12.5, color: "#c2b39a" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#242019",
  border: "1px solid #403627",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#f4ede1",
  fontSize: 13,
  marginTop: 4,
};
