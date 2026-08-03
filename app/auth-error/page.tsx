import Link from "next/link";

export default function AuthError() {
  return (
    <div className="ae-root bg-atmosphere">
      <style>{`
        .ae-root{
          font-family: var(--font-display);
          color:var(--text-1);
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:2rem;
        }
        .ae-panel{
          max-width:420px;
          text-align:center;
          background:var(--glass-bg-strong);
          border:1px solid var(--glass-border);
          border-radius:var(--radius-xl);
          padding:2.5rem 2rem;
          backdrop-filter:blur(var(--glass-blur-strong)) saturate(1.4);
          -webkit-backdrop-filter:blur(var(--glass-blur-strong)) saturate(1.4);
          box-shadow:var(--shadow-glass-lg);
        }
        .ae-title{font-size:20px;font-weight:700;letter-spacing:-.01em;margin:0 0 8px;}
        .ae-body{font-size:13.5px;color:var(--text-3);line-height:1.6;margin:0 0 24px;}
        .ae-link{display:inline-block;background:var(--accent-gradient);color:var(--accent-ink);border-radius:10px;padding:10px 20px;font-weight:600;font-size:13.5px;text-decoration:none;}
      `}</style>
      <div className="ae-panel">
        <h1 className="ae-title">No se pudo iniciar sesión</h1>
        <p className="ae-body">
          Hubo un problema al procesar el acceso. Intentá de nuevo — si el problema persiste,
          avisale a un administrador.
        </p>
        <Link href="/" className="ae-link">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
