"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { SELLOS, STREAMING_PROJECTS } from "@/lib/sellos";

type Track = {
  id: string;
  isrc: string | null;
  track: string;
  album: string | null;
  release_date: string | null;
  upc: string | null;
  company: string | null;
  artist_display: string;
  participants: string[];
  sello: string | null;
  streaming_project: string | null;
};

export default function FonogramaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/catalog/tracks/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setTrack(d.track);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  async function saveClassification(sello: string, streamingProject: string | null) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/catalog/tracks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sello: sello || null, streamingProject }),
      });
      const d = await res.json();
      if (d.error) {
        setSaveMsg(`Error: ${d.error}`);
      } else {
        setTrack(d.track);
        setSaveMsg(
          !sello
            ? "Movido a Catálogo Distribuido."
            : sello === "Streamings" && streamingProject
            ? `Asignado a Streamings › ${streamingProject}.`
            : `Asignado a ${sello}.`
        );
      }
    } catch (e) {
      setSaveMsg(`Error: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  function onSelloChange(sello: string) {
    saveClassification(sello, sello === "Streamings" ? STREAMING_PROJECTS[0] : null);
  }

  function onProjectChange(project: string) {
    saveClassification("Streamings", project);
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
          .inner{max-width:680px;margin:0 auto;padding:2.5rem 2rem 0;}
          .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
          .crumb a{color:var(--text-2);text-decoration:none;}
          .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:16px;padding:1.5rem;margin-bottom:1rem;}
          .field{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:13.5px;}
          .field:last-child{border-bottom:none;}
          .field-label{color:var(--text-3);}
          .field-val{color:var(--text-1);text-align:right;}
          select{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;width:100%;}
          .empty{color:var(--text-3);font-size:13.5px;padding:1rem 0;}
        `}</style>
        <div className="inner">
          <div className="crumb">
            <Link href="/catalogo-distribuido">Catálogo Distribuido</Link> › Fonograma
          </div>

          {error && <p className="empty">Error: {error}</p>}
          {!track && !error && <p className="empty">Cargando...</p>}

          {track && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{track.track}</h1>

              <div className="card">
                <div className="field">
                  <span className="field-label">Artistas / colaboradores</span>
                  <span className="field-val">{track.artist_display.replace(/\|/g, ", ")}</span>
                </div>
                <div className="field">
                  <span className="field-label">Álbum</span>
                  <span className="field-val">{track.album || "—"}</span>
                </div>
                <div className="field">
                  <span className="field-label">ISRC</span>
                  <span className="field-val">{track.isrc || "—"}</span>
                </div>
                <div className="field">
                  <span className="field-label">UPC</span>
                  <span className="field-val">{track.upc || "—"}</span>
                </div>
                <div className="field">
                  <span className="field-label">Fecha de lanzamiento</span>
                  <span className="field-val">{track.release_date || "—"}</span>
                </div>
                <div className="field">
                  <span className="field-label">Distribuido por</span>
                  <span className="field-val">{track.company || "—"}</span>
                </div>
              </div>

              <div className="card">
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Pertenece al sello</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
                  Actual:{" "}
                  {track.sello === "Streamings"
                    ? `Streamings › ${track.streaming_project ?? "sin proyecto"}`
                    : track.sello ?? "Sin asignar (Catálogo Distribuido)"}
                </p>
                <select
                  value={track.sello ?? ""}
                  disabled={saving}
                  onChange={(e) => onSelloChange(e.target.value)}
                >
                  <option value="">Sin asignar (Catálogo Distribuido)</option>
                  {SELLOS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {track.sello === "Streamings" && (
                  <>
                    <p style={{ fontSize: 12, color: "var(--text-3)", margin: "12px 0 6px" }}>
                      Proyecto de streaming
                    </p>
                    <select
                      value={track.streaming_project ?? ""}
                      disabled={saving}
                      onChange={(e) => onProjectChange(e.target.value)}
                    >
                      {STREAMING_PROJECTS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </>
                )}

                {saveMsg && (
                  <p style={{ fontSize: 12, color: "var(--gold)", marginTop: 10 }}>{saveMsg}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
