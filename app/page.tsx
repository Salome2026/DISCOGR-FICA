"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import VPOScrollHero from "./components/VPOScrollHero";

type Card = "label" | "pm" | "legal" | "editorial" | "management" | "booking" | "tourmanager" | "ar" | "cm" | null;
type ModuleOption = { role: string; label: string; home: string };

// Which module the pre-login card the user clicked corresponds to — lets a
// multi-module account skip the module picker when the card they picked
// already says which one they want, instead of asking again after login.
const CARD_TO_ROLE: Record<Exclude<Card, null>, string> = {
  label: "admin",
  pm: "project_manager",
  legal: "legal",
  editorial: "editorial",
  management: "management",
  booking: "booking",
  tourmanager: "tourmanager",
  ar: "ar",
  cm: "community_manager",
};

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
    const availableModules: ModuleOption[] = me.modules ?? [];
    if (availableModules.length === 0) {
      router.push("/acceso-denegado");
      return;
    }
    // The card picked before login already declares intent for a
    // multi-module account — honor it and skip the picker. Only falls back
    // to the picker when that card isn't one of this account's modules
    // (or the account has just one module, which always goes direct).
    const wantedRole = active ? CARD_TO_ROLE[active] : null;
    const wantedModule = wantedRole ? availableModules.find((m) => m.role === wantedRole) : undefined;
    if (wantedModule) {
      router.push(wantedModule.home);
    } else if (availableModules.length === 1) {
      router.push(availableModules[0].home);
    } else {
      setModules(availableModules);
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
        /* Destello de entrada: una sola pasada al montar, ~2s, izquierda a
           derecha, a la altura media del logo. .vpo-logo-stage ancla el
           overlay al tamaño/posición reales del logo (nada de coordenadas
           fijas), y el truco left:50%+width:100vw+translateX(-50%) hace que
           el haz viaje de borde a borde de la pantalla real sin importar
           dónde caiga el logo horizontalmente. */
        .vpo-logo-stage{position:relative; display:inline-block; line-height:0;}
        /* Secuencia completa: (1) el destello se acerca desde el borde real
           de la pantalla hasta la zona de la V (.vpo-flash-beam, retimeado,
           más corto que antes); (2) un punto recorre el contorno real de
           V→P→O sobre un <svg> con las mismas coordenadas del PNG
           (.vpo-trace-svg, generado vectorizando el canal alfa del logo);
           (3) al terminar, el destello general tipo "Iron Man" ilumina las
           tres letras (.vpo-logo-shine, sin cambios en su animación propia,
           solo se retimea para arrancar después del trazo). Los tres tramos
           están encadenados con animation-delay sobre el mismo timeline,
           nunca corren en paralelo. */
        .vpo-flash{position:absolute; top:39%; left:50%; width:100vw; height:0; transform:translate(-50%,-50%); pointer-events:none; overflow:visible;}
        .vpo-flash-beam{
          position:absolute; top:0; left:0; width:160px; height:1.5px; transform:translate(-15vw,-50%);
          background:linear-gradient(90deg, transparent, rgba(255,255,255,.85) 88%, rgba(255,255,255,.95));
          animation:vpo-flash-approach .3s cubic-bezier(.45,0,.2,1) 1 both;
        }
        .vpo-flash-beam::after{
          content:""; position:absolute; right:-1px; top:50%; width:7px; height:7px; border-radius:50%;
          transform:translate(50%,-50%);
          background:radial-gradient(circle, #fff 0%, rgba(255,255,255,.7) 55%, transparent 75%);
          box-shadow:0 0 14px 3px rgba(255,255,255,.75);
        }
        @keyframes vpo-flash-approach{
          0%{opacity:0; transform:translate(-15vw,-50%);}
          20%{opacity:1;}
          100%{opacity:0; transform:translate(38vw,-50%);}
        }
        /* Simétrico al de entrada: retoma el trazo apenas sale de la O y
           lo lleva hasta el borde real de la pantalla (mismo truco de
           coordenadas en vw sobre el contenedor .vpo-flash) — el <path>
           del SVG ya no intenta cruzar toda la pantalla por sí solo, solo
           llega hasta el borde derecho del logo y este beam retoma desde ahí. */
        .vpo-flash-beam-exit{
          position:absolute; top:0; left:0; width:160px; height:1.5px; transform:translate(62vw,-50%);
          background:linear-gradient(90deg, transparent, rgba(255,255,255,.85) 88%, rgba(255,255,255,.95));
          animation:vpo-flash-depart .3s cubic-bezier(.45,0,.2,1) 1.15s 1 both;
        }
        .vpo-flash-beam-exit::after{
          content:""; position:absolute; right:-1px; top:50%; width:7px; height:7px; border-radius:50%;
          transform:translate(50%,-50%);
          background:radial-gradient(circle, #fff 0%, rgba(255,255,255,.7) 55%, transparent 75%);
          box-shadow:0 0 14px 3px rgba(255,255,255,.75);
        }
        @keyframes vpo-flash-depart{
          0%{opacity:0; transform:translate(62vw,-50%);}
          15%{opacity:1;}
          100%{opacity:0; transform:translate(115vw,-50%);}
        }
        /* El trazo: un <path> único (V, palo y pancita de la P, vuelta
           completa de la O y salida) recorrido por un punto brillante
           (SMIL animateMotion, respeta nativamente el viewBox del SVG sin
           líos de coordenadas CSS) más una racha corta de luz que lo sigue
           (stroke-dasharray/dashoffset con pathLength=1000, así el % de
           dashoffset no depende de la longitud real del path). Todo con
           filter:drop-shadow para el glow — nunca cambia el color del logo
           en sí, solo se dibuja encima. */
        .vpo-trace-svg{position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible;}
        .vpo-trace-comet{
          fill:none; stroke:rgba(255,255,255,.95); stroke-width:13; stroke-linecap:round;
          stroke-dasharray:45 955; stroke-dashoffset:1000; opacity:0; visibility:hidden;
          filter:drop-shadow(0 0 7px rgba(255,255,255,.9)) drop-shadow(0 0 18px rgba(214,224,255,.7));
          animation:vpo-trace-sweep 1s linear .25s 1 both;
        }
        /* cx/cy explícitos en el JSX (no 0,0 por default) + visibility acá
           como refuerzo de opacity — antes de que arranque animateMotion
           (begin=.25s) el círculo ya está bien ubicado en el inicio real
           del trazo y encima oculto por completo, así que ningún frame
           intermedio puede mostrar un puntito huérfano arriba de la V. */
        .vpo-trace-dot{
          fill:#fff; opacity:0; visibility:hidden;
          filter:drop-shadow(0 0 9px rgba(255,255,255,1)) drop-shadow(0 0 24px rgba(214,224,255,.8));
          animation:vpo-trace-dot-visibility 1s linear .25s 1 both;
          offset-rotate:0deg;
        }
        /* Plateado durante todo el recorrido salvo al cruzar la P (~24%-55%
           del trazo, medido con getPointAtLength contra el path real) —
           dorado en referencia al sol de la bandera, con una transición
           suave de un par de puntos antes/después en vez de un corte
           brusco. Mismos % en el <path> (stroke/filter) y en el punto
           (fill/filter) para que cambien de color exactamente juntos. */
        @keyframes vpo-trace-sweep{
          0%{stroke-dashoffset:1000; opacity:0; visibility:hidden; stroke:rgba(255,255,255,.95); filter:drop-shadow(0 0 7px rgba(255,255,255,.9)) drop-shadow(0 0 18px rgba(214,224,255,.7));}
          3%{opacity:1; visibility:visible;}
          22%{stroke:rgba(255,255,255,.95); filter:drop-shadow(0 0 7px rgba(255,255,255,.9)) drop-shadow(0 0 18px rgba(214,224,255,.7));}
          25%{stroke:rgba(255,196,64,.97); filter:drop-shadow(0 0 8px rgba(255,196,64,.95)) drop-shadow(0 0 20px rgba(255,150,20,.75));}
          55%{stroke:rgba(255,196,64,.97); filter:drop-shadow(0 0 8px rgba(255,196,64,.95)) drop-shadow(0 0 20px rgba(255,150,20,.75));}
          58%{stroke:rgba(255,255,255,.95); filter:drop-shadow(0 0 7px rgba(255,255,255,.9)) drop-shadow(0 0 18px rgba(214,224,255,.7));}
          97%{opacity:1;}
          100%{stroke-dashoffset:0; opacity:0; visibility:hidden;}
        }
        @keyframes vpo-trace-dot-visibility{
          0%{opacity:0; visibility:hidden; fill:#fff; filter:drop-shadow(0 0 9px rgba(255,255,255,1)) drop-shadow(0 0 24px rgba(214,224,255,.8));}
          3%{opacity:1; visibility:visible;}
          22%{fill:#fff; filter:drop-shadow(0 0 9px rgba(255,255,255,1)) drop-shadow(0 0 24px rgba(214,224,255,.8));}
          25%{fill:#ffcb52; filter:drop-shadow(0 0 10px rgba(255,205,70,1)) drop-shadow(0 0 28px rgba(255,150,20,.85));}
          55%{fill:#ffcb52; filter:drop-shadow(0 0 10px rgba(255,205,70,1)) drop-shadow(0 0 28px rgba(255,150,20,.85));}
          58%{fill:#fff; filter:drop-shadow(0 0 9px rgba(255,255,255,1)) drop-shadow(0 0 24px rgba(214,224,255,.8));}
          95%{opacity:1;}
          100%{opacity:0; visibility:hidden;}
        }
        .vpo-logo-shine{
          position:absolute; inset:0; pointer-events:none; mix-blend-mode:overlay;
          background:linear-gradient(100deg, transparent 30%, rgba(255,255,255,.95) 48%, transparent 66%);
          background-size:280% 100%; background-repeat:no-repeat; background-position:-140% 0;
          -webkit-mask-image:url(/vpo-logo.png); mask-image:url(/vpo-logo.png);
          -webkit-mask-size:contain; mask-size:contain;
          -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
          -webkit-mask-position:center; mask-position:center;
          animation:vpo-logo-shine-sweep .45s cubic-bezier(.45,0,.2,1) 1.35s 1 both;
        }
        @keyframes vpo-logo-shine-sweep{
          0%, 26%{background-position:-140% 0;}
          49%{background-position:0% 0;}
          72%, 100%{background-position:140% 0;}
        }
        @media (prefers-reduced-motion: reduce){
          .vpo-flash-beam, .vpo-flash-beam-exit, .vpo-trace-comet, .vpo-trace-dot, .vpo-logo-shine{animation:none; display:none;}
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
            <div className="access-card">
              <h2>Community Manager</h2>
              <p>Planificación y seguimiento de redes sociales.</p>
              <button className="access-btn" onClick={() => setActive("cm")}>
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
                : active === "cm"
                ? "Acceso Community Manager"
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
