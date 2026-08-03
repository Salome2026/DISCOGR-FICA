"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import VPOScrollHero from "./components/VPOScrollHero";

type Card = "empresa" | "artista" | null;

export default function Landing() {
  const router = useRouter();
  const [active, setActive] = useState<Card>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    const me = await fetch("/api/me").then((r) => r.json());
    router.push(me.home ?? "/acceso-denegado");
  }

  return (
    <div className="landing-root">
      <style>{`
        .landing-root {
          --bg-0:#2a241c; --bg-0b:#3a3226; --bg-1:#332c22; --bg-2:#3d3427;
          --line:#544831; --line-soft:#403627;
          --text-1:#f4ede1; --text-2:#c2b39a; --text-3:#8f8267;
          --gold:#e6a94f;
          font-family:-apple-system,"SF Pro Display",ui-sans-serif,"Segoe UI",Helvetica,Arial,sans-serif;
          background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-0b) 55%,var(--bg-0) 100%);
          color:var(--text-1);
          min-height:100dvh;
        }
        .vpo-hero{height:200dvh;position:relative;}
        .vpo-hero-sticky{
          position:sticky; top:0; height:100dvh;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:18px;
        }
        .vpo-hero-logo{
          width:min(420px, 62vw); height:auto; display:block;
          filter:drop-shadow(0 24px 60px rgba(230,169,79,0.25));
        }
        .vpo-hero-text{text-align:center;}
        .vpo-hero-text p{font-size:14px;color:var(--text-3);margin:0;letter-spacing:.01em;}
        .vpo-hero-scrollhint{position:absolute;bottom:48px;left:0;right:0;text-align:center;font-size:12px;color:var(--text-3);letter-spacing:.02em;}
        .vpo-hero-static{text-align:center;padding:3rem 2rem 1rem;display:flex;flex-direction:column;align-items:center;gap:10px;}
        .vpo-hero-static .vpo-hero-logo{width:min(280px, 60vw);}
        .vpo-hero-static p{font-size:13px;color:var(--text-3);margin:0;}
        .landing-content{display:flex;align-items:center;justify-content:center;padding:2rem 2rem 6rem;}
        .landing-inner{width:100%;max-width:760px;}
        .landing-brand{text-align:center;margin-bottom:2.5rem;}
        .landing-brand .mark{width:44px;height:44px;border-radius:12px;background:linear-gradient(155deg,#e6a94f,#c98f3a);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#241a08;margin:0 auto 12px;}
        .landing-brand h1{font-size:20px;font-weight:700;margin:0;letter-spacing:-.01em;}
        .landing-brand p{font-size:13px;color:var(--text-3);margin:4px 0 0;}
        .cards{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;}
        @media (max-width:640px){ .cards{grid-template-columns:1fr;} }
        .access-card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:20px;padding:2rem;text-align:center;}
        .access-card .emoji{font-size:32px;margin-bottom:12px;}
        .access-card h2{font-size:17px;font-weight:600;margin:0 0 8px;}
        .access-card p{font-size:13px;color:var(--text-2);line-height:1.5;margin:0 0 20px;min-height:40px;}
        .access-btn{width:100%;background:var(--gold);border:none;border-radius:10px;padding:11px;color:#3a2b0f;font-weight:600;cursor:pointer;font-size:13.5px;}
        .access-btn.secondary{background:transparent;border:1px solid var(--line);color:var(--text-1);}
        .login-panel{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:20px;padding:2rem;max-width:380px;margin:0 auto;}
        .login-panel input{width:100%;background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:10px 12px;color:var(--text-1);font-size:13.5px;margin-top:6px;}
        .login-panel label{font-size:12.5px;color:var(--text-2);}
        .back-link{background:none;border:none;color:var(--text-3);font-size:12.5px;cursor:pointer;margin-bottom:16px;padding:0;}
      `}</style>

      <VPOScrollHero />

      <div className="landing-content">
      <div className="landing-inner">
        <div className="landing-brand">
          <div className="mark">V</div>
          <h1>VPO Corp</h1>
          <p>Centro de control · acceso interno</p>
        </div>

        {active === null && (
          <div className="cards">
            <div className="access-card">
              <div className="emoji">👔</div>
              <h2>Empresa</h2>
              <p>Acceso para administradores, project managers y personal interno.</p>
              <button className="access-btn" onClick={() => setActive("empresa")}>
                Ingresar
              </button>
            </div>
            <div className="access-card">
              <div className="emoji">🎤</div>
              <h2>Artista</h2>
              <p>Acceso exclusivo para artistas y representantes.</p>
              <button className="access-btn" onClick={() => setActive("artista")}>
                Ingresar
              </button>
            </div>
          </div>
        )}

        {active !== null && (
          <div className="login-panel">
            <button className="back-link" onClick={() => setActive(null)}>
              ← Volver
            </button>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              {active === "empresa" ? "Acceso Empresa" : "Acceso Artista"}
            </h2>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              {error && (
                <div style={{ color: "#eab3a8", fontSize: 12.5 }}>{error}</div>
              )}
              <button className="access-btn" type="submit" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
            <p style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 16, textAlign: "center" }}>
              No hay registro público — tu cuenta la crea un administrador.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
