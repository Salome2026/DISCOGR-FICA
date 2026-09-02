"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import NuevoLanzamientoForm from "../NuevoLanzamientoForm";
import RequireRole from "@/app/components/RequireRole";
import { PM_STYLES } from "../_shared";

type TaskStatus = "Pendiente" | "Completado" | "No corresponde";

type BoardRelease = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  fecha_lanzamiento: string | null;
  created_by: string;
  created_at: string;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
  audio_url: string | null;
  youtube_url: string | null;
  drive_assets_url: string | null;
  releaseStatus: TaskStatus;
  splitStatus: TaskStatus;
  materialesStatus: TaskStatus;
  materialesEstado: "assets_disponibles" | "video_disponible" | "informacion_parcial" | "assets_pendientes" | "video_pendiente" | "sin_materiales";
};

const MATERIALES_LABEL: Record<BoardRelease["materialesEstado"], string> = {
  assets_disponibles: "Materiales completos",
  video_disponible: "Video disponible",
  informacion_parcial: "Información parcial",
  assets_pendientes: "Falta la carpeta de assets",
  video_pendiente: "Falta el video de YouTube",
  sin_materiales: "Sin materiales cargados",
};

function formatFecha(v: string | null): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

export default function PMFonogramaPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMFonogramaInner />
    </RequireRole>
  );
}

function PMFonogramaInner() {
  const { data: session } = useSession();
  const [releases, setReleases] = useState<BoardRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [assignedArtists, setAssignedArtists] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [overridingId, setOverridingId] = useState<number | null>(null);
  const [editingLinks, setEditingLinks] = useState<BoardRelease | null>(null);

  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const email = session?.user?.email;
  // Esta página ya está restringida a admin/project_manager (RequireRole
  // arriba) y ambos roles tienen el permiso crear_split_editorial — no hace
  // falta un segundo chequeo de permiso solo para el botón de override.

  const loadReleases = useCallback(() => {
    fetch("/api/pm/releases/board")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setReleases(d.releases);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function handleDelete(r: BoardRelease) {
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

  async function handleSplitOverride(r: BoardRelease) {
    setOverridingId(r.id);
    try {
      const res = await fetch(`/api/pm/releases/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splitOverride: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar.");
      loadReleases();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOverridingId(null);
    }
  }

  useEffect(() => {
    loadReleases();
    if (roles.includes("project_manager")) {
      fetch("/api/pm/assigned-artists")
        .then((r) => r.json())
        .then((d) => setAssignedArtists(d.artists ?? []));
    }
    // roles.join(",") (not `roles` itself) as the dependency — the `?? []`
    // fallback creates a new array reference every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles.join(","), loadReleases]);

  return (
    <div className="dash-root bg-atmosphere">
      <style>{PM_STYLES}</style>
      <style>{`
        .dash-root {
          font-family: var(--font-display);
          color:var(--text-1);
          min-height:100vh;
          padding-bottom:5rem;
        }
        .inner{max-width:1100px;margin:0 auto;padding:2.5rem 2rem 0;}
        .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
        .crumb a{color:var(--text-2);text-decoration:none;}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;}
        .btn-primary{background:var(--accent-glass-bg);border:1px solid var(--accent-glass-border);border-radius:8px;padding:10px 18px;color:var(--text-1);font-weight:600;cursor:pointer;font-size:13.5px;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);}
        .btn-ghost{background:transparent;border:1px solid var(--line-soft);border-radius:8px;padding:8px 14px;color:var(--text-2);cursor:pointer;font-size:13px;}
        .card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.5rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
      `}</style>

      <div className="inner">
        <div className="crumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span><Link href="/pm">Project Manager</Link> › Fonograma</span>
          <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesión
          </button>
        </div>

        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>¿Nuevo lanzamiento?</div>
            <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 0" }}>
              Cargá un single, EP o álbum nuevo directamente desde acá.
            </p>
          </div>
          <button className="btn-primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => setShowForm(true)}>
            + Nuevo lanzamiento
          </button>
        </div>

        <div className="topbar">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>
              {isAdmin ? "Todos los lanzamientos" : "Mis lanzamientos"}
            </h1>
            <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "4px 0 0" }}>
              {session?.user?.email} · {isAdmin ? "Administrador" : "Project Manager"}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!releases ? (
          <p style={{ color: "var(--text-3)" }}>Cargando lanzamientos...</p>
        ) : releases.length === 0 ? (
          <p style={{ color: "var(--text-3)" }}>Todavía no hay lanzamientos cargados.</p>
        ) : (
          <div className="pmx-fono-grid">
            {releases.map((r) => (
              <div key={r.id} className="pmx-fono-card">
                <div>
                  <div className="pmx-fono-title">{r.fonograma_nombre}</div>
                  <div className="pmx-fono-meta">
                    {r.artist_name}
                    {r.sello ? ` · ${r.sello}` : ""} · {formatFecha(r.fecha_lanzamiento)}
                    {r.group_tipo && (
                      <>
                        <br />
                        {r.group_tipo === "ep" ? "EP" : "Álbum"} · {r.group_nombre}
                      </>
                    )}
                    {isAdmin && <><br />Cargado por {r.created_by}</>}
                  </div>
                </div>

                <div className="pmx-fono-tasks">
                  <div className="pmx-fono-task">
                    <span className="pmx-fono-task-label">Release</span>
                    <div className="pmx-fono-task-controls">
                      {r.releaseStatus === "Pendiente" && (
                        <Link
                          href={`/pm/fonograma/${r.id}/release`}
                          className="pmx-fono-task-btn"
                        >
                          Completar Release
                        </Link>
                      )}
                      <span className={`pmx-badge ${r.releaseStatus === "Pendiente" ? "pendiente" : "completado"}`}>
                        {r.releaseStatus}
                      </span>
                    </div>
                  </div>
                  <div className="pmx-fono-task">
                    <span className="pmx-fono-task-label">Split editorial</span>
                    <div className="pmx-fono-task-controls">
                      {r.splitStatus === "Pendiente" && (
                        <Link
                          href={`/pm/split-editorial?catalogTrackId=pm-${r.id}&trackName=${encodeURIComponent(r.fonograma_nombre)}&artistDisplay=${encodeURIComponent(r.artist_name)}${r.sello ? `&sello=${encodeURIComponent(r.sello)}` : ""}${r.audio_url ? `&audioUrl=${encodeURIComponent(r.audio_url)}` : ""}`}
                          className="pmx-fono-task-btn"
                        >
                          Completar Split
                        </Link>
                      )}
                      {r.splitStatus === "No corresponde" && (
                        <button
                          type="button"
                          className="pmx-fono-task-btn"
                          disabled={overridingId === r.id}
                          onClick={() => handleSplitOverride(r)}
                        >
                          {overridingId === r.id ? "..." : "¿Requiere split?"}
                        </button>
                      )}
                      <span
                        className={`pmx-badge ${
                          r.splitStatus === "Pendiente" ? "pendiente" : r.splitStatus === "Completado" ? "completado" : "no-corresponde"
                        }`}
                      >
                        {r.splitStatus}
                      </span>
                    </div>
                  </div>
                  <div className="pmx-fono-task">
                    <span className="pmx-fono-task-label">YouTube / Assets</span>
                    <div className="pmx-fono-task-controls">
                      <button
                        type="button"
                        className="pmx-fono-task-btn"
                        onClick={() => setEditingLinks(r)}
                      >
                        {r.materialesStatus === "Completado" ? "Editar links" : "Agregar links"}
                      </button>
                      <span className={`pmx-badge ${r.materialesStatus === "Pendiente" ? "pendiente" : "completado"}`}>
                        {MATERIALES_LABEL[r.materialesEstado]}
                      </span>
                    </div>
                  </div>
                </div>

                {r.sello !== "Streamings" && (
                  <Link
                    href={`/panel/cm/lanzamientos/${r.group_id != null ? `cml-group-${r.group_id}` : `cml-release-${r.id}`}`}
                    style={{ fontSize: 11.5, color: "var(--text-3)", textDecoration: "none" }}
                  >
                    Ver en Community Manager →
                  </Link>
                )}

                {(isAdmin || r.created_by === email) && (
                  <div className="pmx-fono-footer">
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && roles.length > 0 && (
        <NuevoLanzamientoForm
          role={isAdmin ? "admin" : "project_manager"}
          assignedArtists={isAdmin ? null : assignedArtists}
          onClose={() => {
            setShowForm(false);
            loadReleases();
          }}
          onCreated={loadReleases}
        />
      )}

      {editingLinks && (
        <EditLinksModal
          release={editingLinks}
          onClose={() => setEditingLinks(null)}
          onSaved={() => {
            setEditingLinks(null);
            loadReleases();
          }}
        />
      )}
    </div>
  );
}

function EditLinksModal({
  release,
  onClose,
  onSaved,
}: {
  release: BoardRelease;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [youtubeUrl, setYoutubeUrl] = useState(release.youtube_url ?? "");
  const [driveAssetsUrl, setDriveAssetsUrl] = useState(release.drive_assets_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pm/releases/${release.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim(), driveAssetsUrl: driveAssetsUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 480, maxWidth: "95vw", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ fontSize: 16, fontWeight: 700 }}>{release.fonograma_nombre}</div>
        <div>
          <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Link del video de YouTube</label>
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... o youtu.be/..."
            style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 12px", color: "var(--text-1)", fontSize: 13.5, marginTop: 4 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Link de assets (carpeta de Drive)</label>
          <input
            value={driveAssetsUrl}
            onChange={(e) => setDriveAssetsUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 12px", color: "var(--text-1)", fontSize: 13.5, marginTop: 4 }}
          />
        </div>
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
