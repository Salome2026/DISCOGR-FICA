"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NuevoAcuerdo() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [compania, setCompania] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, compania, prioridad, comentario }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo guardar.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nuevo-root">
      <style>{`
        .nuevo-root {
          font-family: var(--font-display);
          background:radial-gradient(ellipse 1200px 600px at 50% -10%, var(--bg-0b) 0%, var(--bg-0) 60%);
          color:var(--text-1);
          min-height:100vh;
          display:flex;
          justify-content:center;
          padding:4rem 1.5rem;
        }
        .nuevo-inner{width:100%;max-width:480px;}
        .nuevo-panel{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:2rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.4);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.4);box-shadow:var(--shadow-glass);}
        .nuevo-field{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--text-2);margin-bottom:14px;}
        .nuevo-field input, .nuevo-field select, .nuevo-field textarea{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:10px 12px;color:var(--text-1);font-size:13.5px;font-family:inherit;}
        .nuevo-field input:focus, .nuevo-field select:focus, .nuevo-field textarea:focus{outline:none;border-color:var(--gold);}
        .nuevo-error{color:var(--crit-ink);background:var(--crit-bg);border:1px solid var(--glass-border);border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:14px;}
        .nuevo-submit{width:100%;background:var(--accent-glass-bg);border:1px solid var(--accent-glass-border);border-radius:10px;padding:11px;color:var(--text-1);font-weight:600;cursor:pointer;font-size:13.5px;backdrop-filter:blur(var(--glass-blur)) saturate(1.4);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.4);box-shadow:var(--shadow-glass);transition:transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);}
        .nuevo-submit:hover:not(:disabled){transform:translateY(-1px);}
        .nuevo-submit:disabled{opacity:.5;cursor:default;}
      `}</style>
      <div className="nuevo-inner">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, letterSpacing: "-.01em" }}>
          Nuevo acuerdo
        </h1>
        <form onSubmit={handleSubmit} className="nuevo-panel">
          <label className="nuevo-field">
            Nombre del acuerdo *
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Artista X"
            />
          </label>

          <label className="nuevo-field">
            Compañía
            <input
              value={compania}
              onChange={(e) => setCompania(e.target.value)}
              placeholder="ADA / FUGA / ELLOS"
            />
          </label>

          <label className="nuevo-field">
            Prioridad
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </label>

          <label className="nuevo-field">
            Comentario
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
            />
          </label>

          {error && <p className="nuevo-error">{error}</p>}

          <button type="submit" disabled={loading} className="nuevo-submit">
            {loading ? "Guardando..." : "Guardar en Notion"}
          </button>
        </form>
      </div>
    </div>
  );
}
