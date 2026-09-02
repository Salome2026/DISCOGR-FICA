"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const STYLES = `
  .acc-root { font-family: var(--font-display); color: var(--text-1); min-height: 100vh; padding-bottom: 5rem; }
  .acc-inner { max-width: 520px; margin: 0 auto; padding: 2.5rem 2rem 0; }
  .acc-topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 1.75rem; }
  .acc-title { font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -.02em; }
  .acc-sub { font-size: 13px; color: var(--text-3); margin-top: 4px; }
  .acc-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 16px; color: var(--text-2); cursor: pointer; font-size: 12.5px; }
  .acc-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.25rem; }
  .acc-card h2 { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
  .acc-card p { font-size: 13px; color: var(--text-3); line-height: 1.5; margin: 0 0 14px; }
  .acc-btn { background: var(--accent-glass-bg); border: 1px solid var(--accent-glass-border); border-radius: 8px; padding: 10px 18px; color: var(--text-1); font-weight: 600; cursor: pointer; font-size: 13.5px; }
  .acc-btn:disabled { opacity: .5; cursor: default; }
  .acc-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 10px 18px; color: var(--text-2); cursor: pointer; font-size: 13.5px; }
  .acc-btn-danger { background: transparent; border: 1px solid var(--crit-ink); color: var(--crit-ink); border-radius: 8px; padding: 10px 18px; cursor: pointer; font-size: 13.5px; }
  .acc-input { width: 100%; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 12px; color: var(--text-1); font-size: 14px; margin-top: 6px; }
  .acc-label { font-size: 12.5px; color: var(--text-2); }
  .acc-error { color: var(--crit-ink); font-size: 12.5px; margin-top: 10px; }
  .acc-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 100px; }
  .acc-badge.on { background: var(--good-bg); color: var(--good-ink); }
  .acc-badge.off { background: var(--bg-2); color: var(--text-3); }
  .acc-qr { display: block; margin: 14px auto; width: 200px; height: 200px; border-radius: 10px; background: #fff; padding: 10px; }
  .acc-secret { font-family: monospace; font-size: 13px; background: var(--bg-2); border-radius: 6px; padding: 8px 10px; text-align: center; letter-spacing: 1px; word-break: break-all; margin-bottom: 14px; }
  .acc-backup-codes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: monospace; font-size: 13.5px; background: var(--bg-2); border-radius: 8px; padding: 14px; margin: 14px 0; }
  .acc-field { margin-bottom: 12px; }
  .acc-mandatory-banner { background: var(--warn-bg, rgba(230,160,40,0.12)); border: 1px solid var(--warn-ink, #e6a028); color: var(--warn-ink, #e6a028); border-radius: 10px; padding: 12px 14px; font-size: 12.5px; line-height: 1.5; margin-bottom: 1.25rem; }
`;

type Me = { authenticated: boolean; email?: string; name?: string; roles?: string[]; totpEnabled?: boolean };

export default function CuentaPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  function load() {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: Me) => {
        if (!d.authenticated) {
          router.push("/");
          return;
        }
        setMe(d);
      });
  }
  useEffect(load, [router]);

  if (!me) return null;

  return (
    <div className="acc-root bg-atmosphere">
      <style>{STYLES}</style>
      <div className="acc-inner">
        <div className="acc-topbar">
          <div>
            <h1 className="acc-title">Mi cuenta</h1>
            <div className="acc-sub">{me.email}</div>
          </div>
          <button className="acc-signout" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesión
          </button>
        </div>

        {me.roles?.includes("admin") && !me.totpEnabled && (
          <div className="acc-mandatory-banner">
            Las cuentas admin necesitan verificación en dos pasos activada — activala para poder seguir usando el resto del panel.
          </div>
        )}

        <ChangePasswordCard totpEnabled={!!me.totpEnabled} />
        <TwoFactorCard totpEnabled={!!me.totpEnabled} onChange={load} />
      </div>
    </div>
  );
}

function ChangePasswordCard({ totpEnabled }: { totpEnabled: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, code: code || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar la contraseña.");
      setDone(true);
      setTimeout(() => signOut({ callbackUrl: "/" }), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="acc-card">
        <h2>Cambiar contraseña</h2>
        <p>✓ Contraseña actualizada. Te vamos a cerrar la sesión para que vuelvas a entrar con la nueva.</p>
      </div>
    );
  }

  return (
    <div className="acc-card">
      <h2>Cambiar contraseña</h2>
      <p>Elegí una contraseña personal — sirve tanto para reemplazar la contraseña inicial compartida como para actualizar la tuya.</p>
      <form onSubmit={handleSubmit}>
        <div className="acc-field">
          <label className="acc-label">Contraseña actual</label>
          <input className="acc-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <div className="acc-field">
          <label className="acc-label">Contraseña nueva (mínimo 8 caracteres)</label>
          <input className="acc-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
        </div>
        <div className="acc-field">
          <label className="acc-label">Repetir contraseña nueva</label>
          <input className="acc-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
        </div>
        {totpEnabled && (
          <div className="acc-field">
            <label className="acc-label">Código de verificación en dos pasos</label>
            <input className="acc-input" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
        )}
        {error && <div className="acc-error">{error}</div>}
        <button type="submit" className="acc-btn" disabled={loading}>
          {loading ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}

function TwoFactorCard({ totpEnabled, onChange }: { totpEnabled: boolean; onChange: () => void }) {
  const [mode, setMode] = useState<"idle" | "setup" | "disable">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  async function startSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el código.");
      setQr(data.qr);
      setSecret(data.secret);
      setMode("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código inválido.");
      setBackupCodes(data.backupCodes);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  function finishAfterBackupCodes() {
    setBackupCodes(null);
    setMode("idle");
    setQr(null);
    setSecret(null);
    onChange();
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo desactivar.");
      setMode("idle");
      setPassword("");
      setCode("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  if (backupCodes) {
    return (
      <div className="acc-card">
        <h2>Guardá tus códigos de respaldo</h2>
        <p>
          Si perdés el acceso a tu app de autenticación, podés usar uno de estos códigos para entrar. Cada uno
          sirve una sola vez — guardalos en un lugar seguro, no se vuelven a mostrar.
        </p>
        <div className="acc-backup-codes">
          {backupCodes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        <button className="acc-btn" onClick={finishAfterBackupCodes}>
          Ya los guardé
        </button>
      </div>
    );
  }

  return (
    <div className="acc-card">
      <h2>
        Verificación en dos pasos{" "}
        <span className={`acc-badge ${totpEnabled ? "on" : "off"}`}>{totpEnabled ? "✓ Activada" : "Desactivada"}</span>
      </h2>

      {mode === "idle" && !totpEnabled && (
        <>
          <p>Sumá un paso más al login con una app de autenticación (Google Authenticator, Authy, etc.).</p>
          <button className="acc-btn" onClick={startSetup} disabled={loading}>
            {loading ? "Generando..." : "Activar verificación en dos pasos"}
          </button>
        </>
      )}

      {mode === "idle" && totpEnabled && (
        <>
          <p>Tu cuenta pide un código además de la contraseña al iniciar sesión.</p>
          <button className="acc-btn-ghost" onClick={() => setMode("disable")}>
            Desactivar
          </button>
        </>
      )}

      {mode === "setup" && qr && (
        <form onSubmit={confirmSetup}>
          <p>Escaneá este código con tu app de autenticación:</p>
          <img className="acc-qr" src={qr} alt="Código QR" />
          {secret && (
            <div className="acc-secret">
              {secret}
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, letterSpacing: 0 }}>
                (si no podés escanear, ingresalo a mano)
              </div>
            </div>
          )}
          <div className="acc-field">
            <label className="acc-label">Código de 6 dígitos</label>
            <input
              className="acc-input"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error && <div className="acc-error">{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="acc-btn" disabled={loading}>
              {loading ? "Confirmando..." : "Confirmar"}
            </button>
            <button type="button" className="acc-btn-ghost" onClick={() => { setMode("idle"); setQr(null); setError(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mode === "disable" && (
        <form onSubmit={handleDisable}>
          <p>Ingresá tu contraseña y un código actual para confirmar.</p>
          <div className="acc-field">
            <label className="acc-label">Contraseña</label>
            <input
              className="acc-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="acc-field">
            <label className="acc-label">Código de 6 dígitos o de respaldo</label>
            <input className="acc-input" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          {error && <div className="acc-error">{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="acc-btn-danger" disabled={loading}>
              {loading ? "Desactivando..." : "Desactivar"}
            </button>
            <button type="button" className="acc-btn-ghost" onClick={() => { setMode("idle"); setPassword(""); setCode(""); setError(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
