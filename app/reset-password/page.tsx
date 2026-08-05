"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const RESET_STYLES = `
  .reset-root { font-family: var(--font-display); color: var(--text-1); min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .reset-panel { background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: var(--radius-xl); padding: 2rem; max-width: 380px; width: 100%; backdrop-filter: blur(var(--glass-blur-strong)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur-strong)) saturate(1.7); box-shadow: var(--shadow-glass-lg); }
  .reset-kicker { font-size: 11px; color: var(--text-3); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
  .reset-title { font-size: 20px; font-weight: 700; margin: 0 0 12px; letter-spacing: -.01em; }
  .reset-sub { font-size: 13px; color: var(--text-3); line-height: 1.6; margin: 0; }
  .reset-panel label { font-size: 12.5px; color: var(--text-2); }
  .reset-panel input { width: 100%; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 10px 12px; color: var(--text-1); font-size: 13.5px; margin-top: 6px; }
  .reset-btn { width: 100%; background: var(--accent-glass-bg); border: 1px solid var(--accent-glass-border); border-radius: 10px; padding: 11px; color: var(--text-1); font-weight: 600; cursor: pointer; font-size: 13.5px; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); transition: transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); text-decoration: none; display: block; text-align: center; }
`;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setStatus(d.valid ? "valid" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo restablecer la contraseña.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="reset-root bg-atmosphere">
      <style>{RESET_STYLES}</style>
      <div className="reset-panel">
        <div className="reset-kicker">VPO Corp · Centro de control</div>
        <h1 className="reset-title">Restablecer contraseña</h1>

        {status === "checking" && <p className="reset-sub">Verificando enlace...</p>}

        {status === "invalid" && (
          <>
            <p className="reset-sub">
              Este enlace venció o ya fue usado. Volvé a la pantalla de inicio de sesión y pedí uno nuevo desde
              &quot;¿Olvidaste tu contraseña?&quot;.
            </p>
            <Link href="/" className="reset-btn" style={{ marginTop: 18 }}>
              Volver al inicio
            </Link>
          </>
        )}

        {status === "valid" && !done && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div>
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            {error && <div style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</div>}
            <button className="reset-btn" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}

        {status === "valid" && done && (
          <>
            <p className="reset-sub">Listo — tu contraseña se actualizó. Ya podés iniciar sesión con la nueva.</p>
            <button className="reset-btn" onClick={() => router.push("/")} style={{ marginTop: 18 }}>
              Ir a iniciar sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
