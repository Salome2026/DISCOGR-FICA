"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RequirePermission from "@/app/components/RequirePermission";

type PendingTrack = {
  id: number;
  driveTitle: string | null;
  driveArtist: string | null;
  matchScore: number | null;
  spotifyTrackId: string;
};

type PendingPlaylist = {
  id: string;
  name: string;
  genre: string | null;
  trackCount: number | null;
  spotifyUrl: string | null;
  coverImageUrl: string | null;
  tracks: PendingTrack[];
};

type IngestResult = {
  totalDocs: number;
  processed: number;
  alreadyDone: number;
  failed: { name: string; genre: string; error: string }[];
  created: { name: string; genre: string; trackCount: number; entryCount: number }[];
  remaining: number;
  done: boolean;
};

function scoreLabel(score: number | null): { text: string; color: string } {
  if (score == null) return { text: "—", color: "var(--text-3)" };
  if (score >= 0.6) return { text: `${Math.round(score * 100)}%`, color: "var(--good-ink)" };
  if (score >= 0.35) return { text: `${Math.round(score * 100)}%`, color: "var(--warn-ink)" };
  return { text: `${Math.round(score * 100)}%`, color: "var(--crit-ink)" };
}

function IngestContent() {
  const [running, setRunning] = useState(false);
  const [totalDocs, setTotalDocs] = useState<number | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [failedLog, setFailedLog] = useState<{ name: string; genre: string; error: string }[]>([]);
  const [createdLog, setCreatedLog] = useState<{ name: string; genre: string; trackCount: number }[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const stopRef = useRef(false);

  const [pending, setPending] = useState<PendingPlaylist[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState<Set<string>>(new Set());

  const loadPending = useCallback(() => {
    setLoadingPending(true);
    fetch("/api/playlists/review")
      .then((r) => r.json())
      .then((d: { playlists?: PendingPlaylist[] }) => setPending(d.playlists ?? []))
      .catch(() => {})
      .finally(() => setLoadingPending(false));
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  async function runIngestion() {
    setRunning(true);
    setRunError(null);
    setDoneCount(0);
    setFailedLog([]);
    setCreatedLog([]);
    stopRef.current = false;
    try {
      let done = false;
      while (!done && !stopRef.current) {
        const res = await fetch("/api/playlists/ingest", { method: "POST" });
        const data: IngestResult & { error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error || "Error desconocido durante la ingesta.");
        setTotalDocs(data.totalDocs);
        setDoneCount(data.totalDocs - data.remaining);
        setFailedLog((f) => [...f, ...data.failed]);
        setCreatedLog((c) => [...c, ...data.created.map(({ name, genre, trackCount }) => ({ name, genre, trackCount }))]);
        done = data.done;
        if (!done) loadPending();
      }
      loadPending();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setRunning(false);
    }
  }

  async function approve(id: string) {
    setApproving((s) => new Set(s).add(id));
    try {
      const res = await fetch(`/api/playlists/${id}/review`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).error || "No se pudo aprobar.");
      setPending((p) => p.filter((pl) => pl.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setApproving((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-.03em",
              margin: 0,
              background: "linear-gradient(180deg,var(--text-1) 30%,var(--text-2) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Creación de playlists desde Drive
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 5 }}>
            Lee la carpeta "PLAYLIST" real, crea cada playlist como privada en Spotify con sus canciones, y las deja acá para revisar antes de publicarlas.
          </p>
        </div>

        <div
          style={{
            background: "var(--glass-bg-strong)",
            border: "1px solid var(--glass-border)",
            borderRadius: 16,
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {totalDocs != null ? `${doneCount} / ${totalDocs} documentos procesados` : "Todavía no se corrió la ingesta"}
            </div>
            <button
              type="button"
              onClick={runIngestion}
              disabled={running}
              style={{
                background: "var(--accent-glass-bg)",
                border: "1px solid var(--accent-glass-border)",
                borderRadius: 10,
                padding: "10px 18px",
                color: "var(--text-1)",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: running ? "default" : "pointer",
                opacity: running ? 0.6 : 1,
              }}
            >
              {running ? "Creando playlists..." : "Iniciar creación"}
            </button>
          </div>

          {totalDocs != null && (
            <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (doneCount / totalDocs) * 100)}%`,
                  background: "var(--accent-color)",
                  transition: "width .3s var(--ease-out)",
                }}
              />
            </div>
          )}

          {runError && (
            <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>
              {runError}
            </div>
          )}

          {failedLog.length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--crit-ink)" }}>
              {failedLog.length} fallaron: {failedLog.map((f) => f.name).join(", ")}
            </div>
          )}

          {createdLog.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-3)", maxHeight: 120, overflowY: "auto" }}>
              {createdLog.map((c, i) => (
                <div key={i}>
                  ✓ {c.genre} — {c.name} ({c.trackCount} temas)
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Cola de revisión</h2>
          <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
            {loadingPending ? "Cargando..." : `${pending.length} pendientes de aprobar`}
          </span>
        </div>

        {!loadingPending && pending.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: 13, padding: "2rem 0", textAlign: "center" }}>
            No hay playlists pendientes de revisión.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.map((p) => (
            <div
              key={p.id}
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer" }}
                onClick={() => toggle(p.id)}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: p.coverImageUrl ? `url(${p.coverImageUrl}) center/cover` : "var(--bg-2)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: "var(--text-3)",
                    textAlign: "center",
                  }}
                >
                  {!p.coverImageUrl && "sin portada"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {p.genre} · {p.tracks.length} temas
                  </div>
                </div>
                {p.spotifyUrl && (
                  <a
                    href={p.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 12, color: "var(--accent-color)", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Abrir en Spotify ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    approve(p.id);
                  }}
                  disabled={approving.has(p.id)}
                  style={{
                    background: "var(--good-bg)",
                    border: "1px solid transparent",
                    borderRadius: 8,
                    padding: "7px 14px",
                    color: "var(--good-ink)",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: approving.has(p.id) ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {approving.has(p.id) ? "Aprobando..." : "Aprobar"}
                </button>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{expanded.has(p.id) ? "▾" : "▸"}</span>
              </div>

              {expanded.has(p.id) && (
                <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--line-soft)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                    {p.tracks.map((t) => {
                      const sl = scoreLabel(t.matchScore);
                      return (
                        <div
                          key={t.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            fontSize: 12.5,
                            padding: "4px 0",
                            borderBottom: "1px solid var(--line-soft)",
                          }}
                        >
                          <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.driveTitle} <span style={{ color: "var(--text-3)" }}>— {t.driveArtist}</span>
                          </span>
                          <span style={{ color: sl.color, fontWeight: 600, whiteSpace: "nowrap" }}>{sl.text}</span>
                        </div>
                      );
                    })}
                    {p.tracks.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>Sin canciones matcheadas.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IngestPage() {
  return (
    <RequirePermission need="editar_playlists">
      <IngestContent />
    </RequirePermission>
  );
}
