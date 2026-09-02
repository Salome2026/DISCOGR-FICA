"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CM_MATERIALES_LABELS } from "../../_shared";

type Launch = {
  id: string;
  artistName: string;
  fonogramaNombre: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  horaLanzamiento: string | null;
  pmEmail: string;
  youtubeUrl: string | null;
  driveAssetsUrl: string | null;
  comentariosPm: string | null;
  revisadoPorCm: boolean;
  materialesEstado: string;
};

type Comment = { id: number; author_email: string; body: string; created_at: string };

function formatFecha(v: string | null): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

function LaunchDetail({ id }: { id: string }) {
  const [launch, setLaunch] = useState<Launch | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/cm/lanzamientos/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLaunch(null); return; }
        setLaunch(d.launch);
        setComments(d.comments ?? []);
      });
  }
  useEffect(load, [id]);

  async function handleMarkReviewed() {
    setMarking(true);
    try {
      const res = await fetch(`/api/cm/lanzamientos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisado: true }),
      });
      if (res.ok) load();
    } finally {
      setMarking(false);
    }
  }

  async function handlePostComment() {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/cm/lanzamientos/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (res.ok) { setNewComment(""); load(); }
    } finally {
      setPosting(false);
    }
  }

  if (launch === undefined) return <CmShell active="lanzamientos"><p className="cm-empty">Cargando...</p></CmShell>;
  if (launch === null) return <CmShell active="lanzamientos"><div className="cm-badge crit">{error ?? "No encontrado"}</div></CmShell>;

  return (
    <CmShell title={launch.fonogramaNombre} subtitle={`${launch.artistName}${launch.sello ? ` · ${launch.sello}` : ""}`} active="lanzamientos">
      <Link href="/panel/cm/lanzamientos" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
        ← Volver a lanzamientos
      </Link>

      <div className="cm-section">
        <div className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, color: "var(--text-2)" }}>
            <span>Fecha de lanzamiento: <strong style={{ color: "var(--text-1)" }}>{formatFecha(launch.fechaLanzamiento)}{launch.horaLanzamiento ? ` · ${launch.horaLanzamiento}` : ""}</strong></span>
            <span>PM responsable: <strong style={{ color: "var(--text-1)" }}>{launch.pmEmail}</strong></span>
          </div>
          <span className={`cm-badge ${launch.materialesEstado === "assets_disponibles" ? "ok" : "warn"}`} style={{ width: "fit-content" }}>
            {CM_MATERIALES_LABELS[launch.materialesEstado] ?? launch.materialesEstado}
          </span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {launch.youtubeUrl && (
              <a href={launch.youtubeUrl} target="_blank" rel="noreferrer" className="cm-btn-ghost" style={{ textDecoration: "none" }}>
                Abrir video de YouTube ↗
              </a>
            )}
            {launch.driveAssetsUrl && (
              <a href={launch.driveAssetsUrl} target="_blank" rel="noreferrer" className="cm-btn-ghost" style={{ textDecoration: "none" }}>
                Abrir carpeta de assets ↗
              </a>
            )}
            {!launch.revisadoPorCm && (
              <button type="button" className="cm-btn" disabled={marking} onClick={handleMarkReviewed}>
                {marking ? "..." : "Marcar como revisado"}
              </button>
            )}
          </div>
          {launch.comentariosPm && (
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>
              <strong>Comentarios del PM:</strong> {launch.comentariosPm}
            </div>
          )}
        </div>
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Comentarios (visible para el PM también)</div>
        <div className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.length === 0 && <p className="cm-empty">Todavía no hay comentarios.</p>}
          {comments.map((c) => (
            <div key={c.id} style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{c.author_email} · {new Date(c.created_at).toLocaleString("es-AR")}</div>
              <div style={{ fontSize: 13.5, marginTop: 2 }}>{c.body}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="cm-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Solicitar un material, avisar que un link no anda, etc."
            />
            <button type="button" className="cm-btn" disabled={posting} onClick={handlePostComment}>
              {posting ? "..." : "Comentar"}
            </button>
          </div>
        </div>
      </div>
    </CmShell>
  );
}

export default function CmLaunchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["community_manager", "management", "project_manager"]}>
      <LaunchDetail id={id} />
    </RequireRole>
  );
}
