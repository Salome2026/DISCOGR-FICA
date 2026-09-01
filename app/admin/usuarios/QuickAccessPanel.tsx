"use client";

import { useEffect, useState } from "react";
import { ROLES_BY_ACCOUNT_TYPE, ROLE_LABELS, type AccountType, type Role } from "@/lib/permissions";

export default function QuickAccessPanel({ onChanged }: { onChanged: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("empresa");
  const [roles, setRoles] = useState<Role[]>([]);
  const [noAdminUsuarios, setNoAdminUsuarios] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  function loadStatus() {
    fetch("/api/admin/shared-password")
      .then((r) => r.json())
      .then((d) => setConfigured(!!d.configured));
  }

  useEffect(loadStatus, []);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/shared-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg("Contraseña común actualizada.");
      setPassword("");
      loadStatus();
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setPwSaving(false);
    }
  }

  function toggleRole(r: Role, checked: boolean) {
    setRoles((prev) => (checked ? [...prev, r] : prev.filter((x) => x !== r)));
  }

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(null);
    if (roles.length === 0) {
      setAddMsg("Seleccioná al menos un módulo.");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/admin/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          accountType,
          roles,
          revokedPermissions: roles.includes("admin") && noAdminUsuarios ? ["administrar_usuarios"] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAddMsg(`${email} agregado — entra con la contraseña común.`);
      setEmail("");
      setName("");
      setRoles([]);
      setNoAdminUsuarios(false);
      onChanged();
    } catch (err) {
      setAddMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Accesos rápidos</p>
      <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 16 }}>
        Agregá un email con un rol, sin poner contraseña individual — esa persona entra con su
        email + la contraseña común que definas acá.
      </p>

      <form onSubmit={savePassword} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Contraseña común</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={configured ? "Ya configurada — escribí para cambiarla" : "Definir contraseña"}
            style={inputStyle}
          />
        </div>
        <button type="submit" disabled={pwSaving} className="btn-primary" style={{ height: 34 }}>
          {pwSaving ? "Guardando..." : configured ? "Actualizar" : "Definir"}
        </button>
        {pwMsg && <span style={{ fontSize: 12, color: "var(--text-2)" }}>{pwMsg}</span>}
      </form>

      <form onSubmit={quickAdd} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Gmail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Tipo</label>
          <select
            value={accountType}
            onChange={(e) => {
              const at = e.target.value as AccountType;
              setAccountType(at);
              setRoles([]);
            }}
            style={inputStyle}
          >
            <option value="empresa">Empresa</option>
            <option value="artista">Artista</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Módulos</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 4, maxWidth: 320 }}>
            {ROLES_BY_ACCOUNT_TYPE[accountType].map((r) => (
              <label key={r} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
                <input type="checkbox" checked={roles.includes(r)} onChange={(e) => toggleRole(r, e.target.checked)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={addSaving} className="btn-primary" style={{ height: 34 }}>
          {addSaving ? "Agregando..." : "+ Agregar acceso"}
        </button>
      </form>
      {roles.includes("admin") && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-2)", marginTop: 10 }}>
          <input type="checkbox" checked={noAdminUsuarios} onChange={(e) => setNoAdminUsuarios(e.target.checked)} />
          Acceso a Label, pero sin poder administrar usuarios
        </label>
      )}
      {addMsg && <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>{addMsg}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "6px 10px",
  color: "var(--text-1)",
  fontSize: 13,
  marginTop: 4,
  height: 34,
};
