"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GENEROS } from "@/lib/genres";
import { SELLOS } from "@/lib/sellos";
import {
  RIZZVOR_PROJECT_STATUSES,
  RIZZVOR_PROJECT_PRIORITIES,
  type RizzvorProject,
} from "@/lib/db/rizzvorProjects";

// Pipeline-progress color scale — index into RIZZVOR_PROJECT_STATUSES maps
// to a position along it, so a project's pill gets visibly "further along"
// as it moves through the stages.
const STATUS_COLORS = [
  "#6b6152", "#8a7c62", "#a89a72", "#c9a668", "#d99a4e",
  "#c96a5a", "#8aa0c9", "#7fae6f", "#dcdde2",
];

function statusColor(status: string): string {
  const idx = RIZZVOR_PROJECT_STATUSES.indexOf(status as (typeof RIZZVOR_PROJECT_STATUSES)[number]);
  return STATUS_COLORS[idx] ?? "var(--accent)";
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="rzp-avatar-img" />;
  }
  return (
    <div className="rzp-avatar-fallback">{name.slice(0, 2).toUpperCase()}</div>
  );
}

export default function RizzvorProyectosPanel({ sello }: { sello: string }) {
  const [projects, setProjects] = useState<RizzvorProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    fetch(`/api/rizzvor/projects?sello=${encodeURIComponent(sello)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setProjects(d.projects);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(reload, [sello]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (priorityFilter && p.priority !== priorityFilter) return false;
      return true;
    });
  }, [projects, statusFilter, priorityFilter]);

  const kpis = useMemo(() => {
    if (!projects) return null;
    const enCurso = projects.filter((p) => p.status !== "Listo para distribuir" && p.status !== "Distribuido" && p.status !== "Lanzado").length;
    const listos = projects.filter((p) => p.status === "Listo para distribuir").length;
    const altaPrioridad = projects.filter((p) => p.priority === "Alta").length;
    return { total: projects.length, enCurso, listos, altaPrioridad };
  }, [projects]);

  return (
    <div className="rzp-root">
      <style>{`
        .rzp-root { display: flex; flex-direction: column; gap: 1.25rem; }
        .rzp-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: .9rem; }
        .rzp-kpi { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1rem 1.2rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); }
        .rzp-kpi .l { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: .06em; }
        .rzp-kpi .n { font-size: 26px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
        @media (max-width: 720px) { .rzp-kpi-row { grid-template-columns: 1fr 1fr; } }

        .rzp-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .rzp-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .rzp-filters select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 7px 10px; color: var(--text-1); font-size: 12.5px; }
        .rzp-btn-primary { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13px; }

        .rzp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
        .rzp-card { display: flex; flex-direction: column; gap: 8px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1rem; text-decoration: none; color: var(--text-1); backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
        .rzp-card:hover { transform: translateY(-2px); border-color: var(--accent-color-glow); }
        .rzp-card-top { display: flex; align-items: center; gap: 10px; }
        .rzp-avatar-img { width: 42px; height: 42px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
        .rzp-avatar-fallback { width: 42px; height: 42px; border-radius: 12px; background: var(--accent-gradient); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
        .rzp-card-name { font-size: 14.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rzp-card-meta { font-size: 11px; color: var(--text-3); }
        .rzp-pill { align-self: flex-start; font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 100px; color: #0c0c0e; }
        .rzp-card-foot { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-3); margin-top: auto; }
        .rzp-priority { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
        .rzp-priority.Alta { color: var(--crit-ink); }
        .rzp-priority.Media { color: var(--warn-ink); }
        .rzp-priority.Baja { color: var(--text-3); }
        .rzp-empty { color: var(--text-3); font-size: 13.5px; padding: 2rem 0; text-align: center; }

        .rzp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 2rem; overflow-y: auto; }
        .rzp-modal { background: var(--glass-bg-strong); backdrop-filter: blur(40px) saturate(1.7); -webkit-backdrop-filter: blur(40px) saturate(1.7); color: var(--text-1); border-radius: 16px; border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass-lg); width: 100%; max-width: 480px; padding: 1.5rem; display: flex; flex-direction: column; gap: 12px; }
        .rzp-modal h2 { font-size: 18px; font-weight: 700; margin: 0; }
        .rzp-field { display: flex; flex-direction: column; gap: 4px; }
        .rzp-field label { font-size: 11.5px; color: var(--text-3); }
        .rzp-field input, .rzp-field select, .rzp-field textarea { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 11px; color: var(--text-1); font-size: 13px; font-family: inherit; }
        .rzp-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
        .rzp-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 14px; color: var(--text-2); cursor: pointer; font-size: 13px; }
      `}</style>

      {error && <p className="rzp-empty">Error: {error}</p>}

      {kpis && (
        <div className="rzp-kpi-row">
          <div className="rzp-kpi"><div className="l">Total</div><div className="n">{kpis.total}</div></div>
          <div className="rzp-kpi"><div className="l">En curso</div><div className="n">{kpis.enCurso}</div></div>
          <div className="rzp-kpi"><div className="l">Listos para distribuir</div><div className="n">{kpis.listos}</div></div>
          <div className="rzp-kpi"><div className="l">Prioridad alta</div><div className="n">{kpis.altaPrioridad}</div></div>
        </div>
      )}

      <div className="rzp-toolbar">
        <div className="rzp-filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            {RIZZVOR_PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">Toda prioridad</option>
            {RIZZVOR_PROJECT_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <button className="rzp-btn-primary" onClick={() => setShowCreate(true)}>+ Nuevo proyecto</button>
      </div>

      {projects === null && !error && <p className="rzp-empty">Cargando proyectos...</p>}
      {projects !== null && filtered.length === 0 && (
        <p className="rzp-empty">No hay proyectos {statusFilter || priorityFilter ? "que coincidan con el filtro" : "todavía"}.</p>
      )}

      <div className="rzp-grid">
        {filtered.map((p) => (
          <Link key={p.id} href={`/rizzvor/proyectos/${p.id}`} className="rzp-card">
            <div className="rzp-card-top">
              <Avatar name={p.artistName} url={p.artistPhotoUrl} />
              <div style={{ minWidth: 0 }}>
                <div className="rzp-card-name">{p.artistName}</div>
                <div className="rzp-card-meta">{p.genero || "Sin género"}</div>
              </div>
            </div>
            <span className="rzp-pill" style={{ background: statusColor(p.status) }}>{p.status}</span>
            <div className="rzp-card-foot">
              <span className={`rzp-priority ${p.priority}`}>{p.priority}</span>
              <span>{p.fechaEstimada ? new Date(p.fechaEstimada).toLocaleDateString("es-AR") : "Sin fecha"}</span>
            </div>
          </Link>
        ))}
      </div>

      {showCreate && (
        <CreateProjectModal
          defaultSello={sello}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CreateProjectModal({
  defaultSello,
  onClose,
  onCreated,
}: {
  defaultSello: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [artistName, setArtistName] = useState("");
  const [sello, setSello] = useState(defaultSello);
  const [genero, setGenero] = useState("");
  const [priority, setPriority] = useState<string>("Media");
  const [responsableEmail, setResponsableEmail] = useState("");
  const [fechaEstimada, setFechaEstimada] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!artistName.trim()) {
      setError("El nombre del artista es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rizzvor/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName,
          sello,
          genero: genero || null,
          priority,
          responsableEmail: responsableEmail || null,
          fechaEstimada: fechaEstimada || null,
          notas: notas || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el proyecto.");
        setSaving(false);
        return;
      }
      onCreated();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <div className="rzp-modal-overlay" onClick={onClose}>
      <form className="rzp-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Nuevo proyecto</h2>
        <div className="rzp-field">
          <label>Artista *</label>
          <input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Nombre del artista" />
        </div>
        <div className="rzp-field">
          <label>Sello</label>
          <select value={sello} onChange={(e) => setSello(e.target.value)}>
            {SELLOS.filter((s) => s !== "Streamings").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="rzp-field">
          <label>Género</label>
          <select value={genero} onChange={(e) => setGenero(e.target.value)}>
            <option value="">Sin definir</option>
            {GENEROS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="rzp-field">
          <label>Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {RIZZVOR_PROJECT_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="rzp-field">
          <label>Responsable (email)</label>
          <input value={responsableEmail} onChange={(e) => setResponsableEmail(e.target.value)} placeholder="nombre@mawzrecords.com" />
        </div>
        <div className="rzp-field">
          <label>Fecha estimada de lanzamiento</label>
          <input type="date" value={fechaEstimada} onChange={(e) => setFechaEstimada(e.target.value)} />
        </div>
        <div className="rzp-field">
          <label>Notas / observaciones internas</label>
          <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        {error && <p style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</p>}
        <div className="rzp-modal-actions">
          <button type="button" className="rzp-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="rzp-btn-primary" disabled={saving}>
            {saving ? "Creando..." : "Crear proyecto"}
          </button>
        </div>
      </form>
    </div>
  );
}
