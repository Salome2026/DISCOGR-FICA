"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import NuevoLanzamientoForm from "./NuevoLanzamientoForm";
import RequireRole from "@/app/components/RequireRole";

type Release = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  estado: string;
  distribuidora: string | null;
  fecha_lanzamiento: string | null;
  hora_lanzamiento: string | null;
  autores_compositores: string | null;
  audio_url: string | null;
  portada_url: string | null;
  created_by: string;
  created_at: string;
  track_number: number | null;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
  streaming_project: string | null;
};

function formatFecha(v: string | null): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

const estadoColor: Record<string, string> = {
  Firmado: "#8fb98a",
  Contactado: "#8aa0c9",
  "Necesito ayuda": "#c98a86",
};

export default function PMModule() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMModuleInner />
    </RequireRole>
  );
}

function PMModuleInner() {
  const { data: session } = useSession();
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [assignedArtists, setAssignedArtists] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const email = session?.user?.email;

  const loadReleases = useCallback(() => {
    fetch("/api/pm/releases")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setReleases(d.releases);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function handleDelete(r: Release) {
    const label = r.group_tipo
      ? `todo el ${r.group_tipo === "ep" ? "EP" : "álbum"} "${r.group_nombre}" y sus canciones`
      : `"${r.fonograma_nombre}"`;
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/pm/releases/${r.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar.");
      loadReleases();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadReleases();
    if (role === "project_manager") {
      fetch("/api/pm/assigned-artists")
        .then((r) => r.json())
        .then((d) => setAssignedArtists(d.artists ?? []));
    }
  }, [role, loadReleases]);

  return (
    <div className="dash-root bg-atmosphere">
      <style>{`
        .dash-root {
          font-family: var(--font-display);
          color:var(--text-1);
          min-height:100vh;
          padding-bottom:5rem;
        }
        .inner{max-width:1000px;margin:0 auto;padding:2.5rem 2rem 0;}
        .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
        .crumb a{color:var(--text-2);text-decoration:none;}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;}
        .btn-primary{background:var(--accent-glass-bg);border:1px solid var(--accent-glass-border);border-radius:8px;padding:10px 18px;color:var(--text-1);font-weight:600;cursor:pointer;font-size:13.5px;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);}
        .btn-ghost{background:transparent;border:1px solid var(--line-soft);border-radius:8px;padding:8px 14px;color:var(--text-2);cursor:pointer;font-size:13px;}
        .card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.5rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        .badge{font-size:11px;padding:3px 9px;border-radius:100px;font-weight:600;color:var(--bg-0);}
      `}</style>

      <div className="inner">
        <div className="crumb">
          <Link href="/dashboard">Dashboard</Link> › Project Managers
        </div>

        <div className="topbar">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>
              {role === "admin" ? "Todos los lanzamientos" : "Mis lanzamientos"}
            </h1>
            <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 0" }}>
              {session?.user?.email} · {role === "admin" ? "Administrador" : "Project Manager"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>
              Cerrar sesión
            </button>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Nuevo lanzamiento
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="card">
          {!releases ? (
            <p style={{ color: "var(--text-3)" }}>Cargando lanzamientos...</p>
          ) : releases.length === 0 ? (
            <p style={{ color: "var(--text-3)" }}>Todavía no hay lanzamientos cargados.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Artista</th>
                  <th>Fonograma</th>
                  <th>Sello</th>
                  <th>Estado</th>
                  <th>Distribuidora</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Autores/compositores</th>
                  <th>Audio</th>
                  <th>Portada</th>
                  {role === "admin" && <th>Cargado por</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <td>{r.artist_name}</td>
                    <td>
                      {r.fonograma_nombre}
                      {r.group_tipo && (
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                          {r.group_tipo === "ep" ? "EP" : "Álbum"} · {r.group_nombre}
                          {r.track_number ? ` · #${r.track_number}` : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      {r.sello ?? "—"}
                      {r.sello === "Streamings" && r.streaming_project && (
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                          › {r.streaming_project}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{ background: estadoColor[r.estado] ?? "#71737d" }}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td>{r.distribuidora ?? "—"}</td>
                    <td>{formatFecha(r.fecha_lanzamiento)}</td>
                    <td>{r.hora_lanzamiento || "00:00"}</td>
                    <td>{r.autores_compositores ?? "—"}</td>
                    <td>
                      {r.audio_url ? (
                        <a href={r.audio_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)" }}>
                          ✓ Escuchar
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.portada_url ? (
                        <a href={r.portada_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)" }}>
                          ✓ Ver
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    {role === "admin" && <td>{r.created_by}</td>}
                    <td>
                      {(role === "admin" || r.created_by === email) && (
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--crit-ink)",
                            color: "var(--crit-ink)",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: deletingId === r.id ? "default" : "pointer",
                            opacity: deletingId === r.id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === r.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && role && (
        <NuevoLanzamientoForm
          role={role as "admin" | "project_manager"}
          assignedArtists={role === "admin" ? null : assignedArtists}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadReleases();
          }}
        />
      )}
    </div>
  );
}
