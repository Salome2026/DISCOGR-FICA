"use client";

import { useEffect, useState } from "react";
import { ROLES_BY_ACCOUNT_TYPE, type AccountType, type Role } from "@/lib/permissions";

export default function QuickAccessPanel({ onChanged }: { onChanged: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("empresa");
  const [role, setRole] = useState<Role>("project_manager");
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

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(null);
    setAddSaving(true);
    try {
      const res = await fetch("/api/admin/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, accountType, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAddMsg(`${email} agregado — entra con la contraseña común.`);
      setEmail("");
      setName("");
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
              setRole(ROLES_BY_ACCOUNT_TYPE[at][0]);
            }}
            style={inputStyle}
          >
            <option value="empresa">Empresa</option>
            <option value="artista">Artista</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={inputStyle}>
            {ROLES_BY_ACCOUNT_TYPE[accountType].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={addSaving} className="btn-primary" style={{ height: 34 }}>
          {addSaving ? "Agregando..." : "+ Agregar acceso"}
        </button>
      </form>
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
