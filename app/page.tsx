"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import VPOScrollHero from "./components/VPOScrollHero";

type Card = "label" | "pm" | "legal" | "editorial" | "management" | "booking" | "tourmanager" | "ar" | null;
type ModuleOption = { role: string; label: string; home: string };

export default function Landing() {
  const router = useRouter();
  const [active, setActive] = useState<Card>(null);
  const [modules, setModules] = useState<ModuleOption[] | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reaching the login panel means scrolling past the full-height hero, so
  // whoever clicks "Ingresar" is already deep into the page — bring the
  // panel to a comfortable position instead of leaving it wherever it
  // happens to land relative to their current scroll.
  useEffect(() => {
    if (active && panelRef.current) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panelRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
  }, [active]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!needsTotp) {
      // Peek before touching NextAuth at all — if this account has 2FA on,
      // switch to asking for the code instead of attempting (and failing)
      // a real sign-in with no code attached.
      const check = await fetch("/api/auth/login-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).then((r) => r.json());
      if (check.error) {
        setLoading(false);
        setError(check.error);
        return;
      }
      if (check.needsTotp) {
        setLoading(false);
        setNeedsTotp(true);
        return;
      }
    }

    const res = await signIn("credentials", {
      email,
      password,
      totpCode: needsTotp ? totpCode : undefined,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(needsTotp ? "Código inválido." : "Email o contraseña incorrectos.");
      return;
    }
    // Renews (or, the first time, establishes) this browser's 30-day 2FA
    // trust window — a no-op for accounts without 2FA. Fire-and-forget: a
    // failure here shouldn't block getting into an app you just logged
    // into, worst case is just being asked for the code again next time.
    fetch("/api/auth/trust-device", { method: "POST" }).catch(() => {});
    const me = await fetch("/api/me").then((r) => r.json());
    if (me.modules?.length === 1) {
      router.push(me.modules[0].home);
    } else if (me.modules?.length > 1) {
      setModules(me.modules);
    } else {
      router.push("/acceso-denegado");
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotMsg(data.message ?? "Si el correo está registrado, vas a recibir un enlace para restablecer tu contraseña.");
    } catch {
      setForgotMsg("Hubo un error de conexión. Intentá de nuevo en unos minutos.");
    } finally {
      setForgotLoading(false);
    }
  }

  function backToCards() {
    setActive(null);
    setForgotMode(false);
    setForgotEmail("");
    setForgotMsg(null);
    setNeedsTotp(false);
    setTotpCode("");
  }

  return (
    <div className="landing-root bg-atmosphere">
      <style>{`
        .landing-root {
          font-family: var(--font-display);
          color:var(--text-1);
          min-height:100dvh;
        }
        .vpo-hero{height:140dvh;position:relative;}
        @media (max-width:640px){ .vpo-hero{height:118dvh;} }
        .vpo-hero-sticky{
          position:sticky; top:0; height:100dvh;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:18px;
        }
        .vpo-hero-logo{
          width:min(420px, 62vw); height:auto; display:block;
          filter:drop-shadow(0 24px 60px rgba(230,230,236,0.22));
        }
        .vpo-hero-text{text-align:center;}
        .vpo-hero-text p{font-size:14px;color:var(--text-3);margin:0;letter-spacing:.01em;}
        .vpo-hero-scrollhint{position:absolute;bottom:48px;left:0;right:0;text-align:center;font-size:12px;color:var(--text-3);letter-spacing:.02em;}
        .vpo-hero-static{text-align:center;padding:3rem 2rem 1rem;display:flex;flex-direction:column;align-items:center;gap:10px;}
        .vpo-hero-static .vpo-hero-logo{width:min(280px, 60vw);}
        .vpo-hero-static p{font-size:13px;color:var(--text-3);margin:0;}
        .landing-content{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:2rem 2rem 6rem;}
        .landing-watermark{position:absolute;top:0;right:0;width:min(65vw, 820px);height:auto;opacity:.05;filter:grayscale(1) brightness(1.4);pointer-events:none;z-index:0;transform:translate(20%, -15%);}
        .landing-inner{position:relative;z-index:1;width:100%;max-width:1080px;}
        .cards{display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:1.25rem;justify-content:center;}
        @media (max-width:640px){ .cards{grid-template-columns:1fr;} }
        .access-card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-xl);padding:2rem;text-align:center;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);transition:border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);display:flex;flex-direction:column;}
        .access-card:hover{border-color:var(--accent-color-glow);box-shadow:var(--shadow-glass), 0 0 30px -10px var(--accent-color-glow);}
        .access-card h2{font-size:17px;font-weight:600;margin:0 0 8px;}
        .access-card p{font-size:13px;color:var(--text-2);line-height:1.5;margin:0 0 20px;min-height:40px;}
        .access-btn{width:100%;margin-top:auto;background:var(--accent-glass-bg);border:1px solid var(--accent-glass-border);border-radius:10px;padding:11px;color:var(--text-1);font-weight:600;cursor:pointer;font-size:13.5px;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);transition:transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);}
        .access-btn:hover{transform:translateY(-1px);}
        .access-btn.secondary{background:transparent;border:1px solid var(--line);color:var(--text-1);}
        .login-panel{background:var(--glass-bg-strong);border:1px solid var(--glass-border);border-radius:var(--radius-xl);padding:2rem;max-width:380px;margin:0 auto;backdrop-filter:blur(var(--glass-blur-strong)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur-strong)) saturate(1.7);box-shadow:var(--shadow-glass-lg);}
        .login-panel input{width:100%;background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:10px 12px;color:var(--text-1);font-size:13.5px;margin-top:6px;}
        .login-panel label{font-size:12.5px;color:var(--text-2);}
        .back-link{background:none;border:none;color:var(--text-3);font-size:12.5px;cursor:pointer;margin-bottom:16px;padding:0;}
        .forgot-link{background:none;border:none;color:var(--text-3);font-size:12px;cursor:pointer;padding:0;text-align:center;text-decoration:underline;text-underline-offset:2px;}
        .forgot-link:hover{color:var(--text-2);}
      `}</style>

      <VPOScrollHero />

      <div className="landing-content">
      <Image
        src="/vpo-logo.png"
        alt=""
        width={2539}
        height={1298}
        className="landing-watermark"
        aria-hidden
        priority={false}
      />
      <div className="landing-inner">
        {modules !== null && (
          <div className="cards">
            {modules.map((m) => (
              <div className="access-card" key={m.role}>
                <h2>{m.label}</h2>
                <p>Ingresar a este módulo.</p>
                <button className="access-btn" onClick={() => router.push(m.home)}>
                  Ingresar
                </button>
              </div>
            ))}
          </div>
        )}

        {modules === null && active === null && (
          <div className="cards">
            <div className="access-card">
              <h2>Label</h2>
              <p>Acceso para administradores y gestión de sellos.</p>
              <button className="access-btn" onClick={() => setActive("label")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <h2>Project Manager</h2>
              <p>Módulo de carga para fonogramas, split y releases.</p>
              <button className="access-btn" onClick={() => setActive("pm")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <h2>Legales</h2>
              <p>Acceso para el equipo legal y aprobación de lanzamientos.</p>
              <button className="access-btn" onClick={() => setActive("legal")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <h2>Publishing</h2>
              <p>Acceso para Tango Made In Argentina Publishing.</p>
              <button className="access-btn" onClick={() => setActive("editorial")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <h2>Management</h2>
              <p>Acceso al roster, calendario y próximos lanzamientos.</p>
              <button className="access-btn" onClick={() => setActive("management")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <h2>Booking</h2>
              <p>Acceso a la agenda de shows, mapa y contactos.</p>
              <button className="access-btn" onClick={() => setActive("booking")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <h2>Tour Manager</h2>
              <p>Acceso para quienes acompañan a los artistas de gira.</p>
              <button className="access-btn" onClick={() => setActive("tourmanager")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <h2>A&amp;R</h2>
              <p>Descubrimiento de talento y tendencias musicales.</p>
              <button className="access-btn" onClick={() => setActive("ar")}>
                Ingresar
              </button>
            </div>
          </div>
        )}

        {modules === null && active !== null && (
          <div className="login-panel" ref={panelRef}>
            <button className="back-link" onClick={backToCards}>
              ← Volver
            </button>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              {forgotMode
                ? "Restablecer contraseña"
                : active === "label"
                ? "Acceso Label"
                : active === "pm"
                ? "Acceso Project Manager"
                : active === "legal"
                ? "Acceso Legales"
                : active === "editorial"
                ? "Acceso Publishing"
                : active === "management"
                ? "Acceso Management"
                : active === "booking"
                ? "Acceso Booking"
                : active === "ar"
                ? "Acceso A&R"
                : "Acceso Tour Manager"}
            </h2>

            {!forgotMode ? (
              <>
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {!needsTotp ? (
                    <>
                      <div>
                        <label>Usuario o email</label>
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="username"
                          required
                        />
                      </div>
                      <div>
                        <label>Contraseña</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label>Código de verificación</label>
                      <p style={{ fontSize: 12, color: "var(--text-3)", margin: "2px 0 8px" }}>
                        Abrí tu app de autenticación e ingresá el código de 6 dígitos, o un código de respaldo.
                      </p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        autoComplete="one-time-code"
                        autoFocus
                        required
                      />
                    </div>
                  )}
                  {error && (
                    <div style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</div>
                  )}
                  <button className="access-btn" type="submit" disabled={loading}>
                    {loading ? "Ingresando..." : "Ingresar"}
                  </button>
                  {needsTotp ? (
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => {
                        setNeedsTotp(false);
                        setTotpCode("");
                        setError(null);
                      }}
                    >
                      ← Volver
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => {
                        setForgotMode(true);
                        setForgotEmail(email);
                        setForgotMsg(null);
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </form>
                <p style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 16, textAlign: "center" }}>
                  No hay registro público — tu cuenta la crea un administrador.
                </p>
              </>
            ) : (
              <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: 0 }}>
                  Ingresá tu correo electrónico y, si está registrado, te enviamos un enlace para restablecer tu contraseña.
                </p>
                <div>
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={!!forgotMsg}
                  />
                </div>
                {forgotMsg && (
                  <div style={{ fontSize: 12.5, color: "var(--good-ink)" }}>{forgotMsg}</div>
                )}
                {!forgotMsg && (
                  <button className="access-btn" type="submit" disabled={forgotLoading}>
                    {forgotLoading ? "Enviando..." : "Enviar enlace"}
                  </button>
                )}
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => {
                    setForgotMode(false);
                    setForgotMsg(null);
                  }}
                >
                  ← Volver a iniciar sesión
                </button>
              </form>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
