"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";

type Project = { id: number; name: string; active: boolean };
type Track = { streaming_project: string | null };

export default function StreamingsIndex() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function loadProjects() {
    fetch("/api/streaming-projects?all=1")
      .then((r) => r.json())
      .then((d) => !d.error && setProjects(d.projects))
      .catch(() => {});
  }

  useEffect(() => {
    loadProjects();
    fetch("/api/catalog/tracks?sello=Streamings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        const c: Record<string, number> = {};
        for (const t of d.tracks as Track[]) {
          if (!t.streaming_project) continue;
          c[t.streaming_project] = (c[t.streaming_project] || 0) + 1;
        }
        setCounts(c);
      })
      .catch(() => {});
  }, []);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/streaming-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const d = await res.json();
      if (d.error) setMsg(`Error: ${d.error}`);
      else {
        setNewName("");
        loadProjects();
      }
    } catch (e) {
      setMsg(`Error: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Project) {
    await fetch(`/api/streaming-projects/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    loadProjects();
  }

  return (
    <RequireRole allow={["admin"]}>
      <div className="dash-root">
        <style>{`
          .dash-root {
            --bg-0:#2a241c; --bg-0b:#3a3226; --bg-1:#332c22; --bg-2:#3d3427;
            --line:#544831; --line-soft:#403627;
            --text-1:#f4ede1; --text-2:#c2b39a; --text-3:#8f8267;
            --gold:#e6a94f;
            font-family:-apple-system,"SF Pro Display",ui-sans-serif,"Segoe UI",Helvetica,Arial,sans-serif;
            background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-0b) 55%,var(--bg-0) 100%);
            color:var(--text-1);
            min-height:100vh;
            padding-bottom:5rem;
          }
          .inner{max-width:1120px;margin:0 auto;padding:2.5rem 2rem 0;}
          .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
          .crumb a{color:var(--text-2);text-decoration:none;}
          .proj-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:1.5rem;}
          .proj-card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;position:relative;}
          .proj-card.inactive{opacity:.5;}
          .proj-card a{text-decoration:none;color:var(--text-1);display:block;}
          .proj-card:hover{background:var(--bg-2);border-color:var(--line);}
          .proj-name{font-size:16px;font-weight:700;margin-bottom:6px;}
          .proj-sub{font-size:12.5px;color:var(--text-3);}
          .proj-toggle{position:absolute;top:10px;right:10px;font-size:10.5px;padding:3px 8px;border-radius:100px;border:1px solid var(--line-soft);background:var(--bg-2);color:var(--text-2);cursor:pointer;}
          .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;margin-top:1.5rem;}
          .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;margin-bottom:10px;}
          .add-row{display:flex;gap:8px;}
          .add-row input{flex:1;background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;}
          .add-row button{background:var(--gold);border:none;border-radius:8px;padding:8px 16px;color:#3a2b0f;font-weight:600;font-size:13px;cursor:pointer;}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/dashboard">Dashboard</Link> › Streamings
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Streamings</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>
            Proyectos de streaming de VPO. Cada uno tiene su propio dashboard, igual que un sello.
          </p>

          <div className="proj-grid">
            {(projects ?? []).map((p) => (
              <div key={p.id} className={`proj-card${p.active ? "" : " inactive"}`}>
                <button type="button" className="proj-toggle" onClick={() => toggleActive(p)}>
                  {p.active ? "Desactivar" : "Reactivar"}
                </button>
                <Link href={`/streamings/${encodeURIComponent(p.name)}`}>
                  <div className="proj-name">{p.name}</div>
                  <div className="proj-sub">
                    {counts ? `${counts[p.name] ?? 0} fonogramas` : "Cargando..."}
                    {!p.active ? " · inactivo" : ""}
                  </div>
                </Link>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-label">Agregar proyecto de streaming</div>
            <form className="add-row" onSubmit={addProject}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del nuevo proyecto"
              />
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "+ Agregar"}
              </button>
            </form>
            {msg && <p style={{ fontSize: 12, color: "#eab3a8", marginTop: 8 }}>{msg}</p>}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
