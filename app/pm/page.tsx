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
  autores_compositores: string | null;
  audio_url: string | null;
  portada_url: string | null;
  created_by: string;
  created_at: string;
};

const estadoColor: Record<string, string> = {
  Firmado: "#7fae6f",
  Contactado: "#8aa0c9",
  "Necesito ayuda": "#c96a5a",
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

  const role = (session?.user as { role?: string } | undefined)?.role;

  const loadReleases = useCallback(() => {
    fetch("/api/pm/releases")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setReleases(d.releases);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    loadReleases();
    if (role === "project_manager") {
      fetch("/api/pm/assigned-artists")
        .then((r) => r.json())
        .then((d) => setAssignedArtists(d.artists ?? []));
    }
  }, [role, loadReleases]);

  return (
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
        .inner{max-width:1000px;margin:0 auto;padding:2.5rem 2rem 0;}
        .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
        .crumb a{color:var(--text-2);text-decoration:none;}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;}
        .btn-primary{background:var(--gold);border:none;border-radius:8px;padding:10px 18px;color:#3a2b0f;font-weight:600;cursor:pointer;font-size:13.5px;}
        .btn-ghost{background:transparent;border:1px solid var(--line-soft);border-radius:8px;padding:8px 14px;color:var(--text-2);cursor:pointer;font-size:13px;}
        .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        .badge{font-size:11px;padding:3px 9px;border-radius:100px;font-weight:600;color:#0b0b0b;}
      `}</style>

      <div className="inner">
        <div className="crumb">
          <Link href="/dashboard">Dashboard</Link> › Project Managers
        </div>

        <div className="topbar">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
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
          <div style={{ background: "#3d2a24", color: "#eab3a8", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
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
                  <th>Autores/compositores</th>
                  <th>Audio</th>
                  <th>Portada</th>
                  {role === "admin" && <th>Cargado por</th>}
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <td>{r.artist_name}</td>
                    <td>{r.fonograma_nombre}</td>
                    <td>{r.sello ?? "—"}</td>
                    <td>
                      <span
                        className="badge"
                        style={{ background: estadoColor[r.estado] ?? "#8a7c62" }}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td>{r.distribuidora ?? "—"}</td>
                    <td>{r.fecha_lanzamiento ?? "—"}</td>
                    <td>{r.autores_compositores ?? "—"}</td>
                    <td>
                      {r.audio_url ? (
                        <a href={r.audio_url} target="_blank" rel="noopener noreferrer" style={{ color: "#e6a94f" }}>
                          ✓ Escuchar
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.portada_url ? (
                        <a href={r.portada_url} target="_blank" rel="noopener noreferrer" style={{ color: "#e6a94f" }}>
                          ✓ Ver
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    {role === "admin" && <td>{r.created_by}</td>}
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
