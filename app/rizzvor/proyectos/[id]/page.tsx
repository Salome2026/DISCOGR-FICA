"use client";

import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { use, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { SELLOS } from "@/lib/sellos";
import { GENEROS } from "@/lib/genres";
import {
  RIZZVOR_PROJECT_STATUSES,
  RIZZVOR_PROJECT_PRIORITIES,
  RIZZVOR_FILE_KINDS,
  type RizzvorProject,
  type RizzvorProjectSong,
  type RizzvorProjectFile,
  type RizzvorChecklistItem,
} from "@/lib/db/rizzvorProjects";
import ChecklistSection from "./ChecklistSection";
import HistorySection from "./HistorySection";
import CommentsSection from "./CommentsSection";
import AudioPlayerBar, { type PlayerTrack } from "../../AudioPlayerBar";
import ConvertButton from "./ConvertButton";

const FILE_KIND_LABELS: Record<string, string> = {
  foto_artista: "Fotos del artista",
  audio_preview: "Audio (preview)",
  audio_wav: "Audio (WAV master)",
  portada: "Portadas",
  documento: "Documentación",
  otro: "Otros archivos",
};

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

type Bundle = {
  project: RizzvorProject;
  songs: RizzvorProjectSong[];
  files: RizzvorProjectFile[];
  checklist: RizzvorChecklistItem[];
};

export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{ tracks: PlayerTrack[]; index: number } | null>(null);

  function reload() {
    fetch(`/api/rizzvor/projects/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setBundle(d);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(reload, [id]);

  async function patchProject(body: Record<string, unknown>) {
    await fetch(`/api/rizzvor/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    reload();
  }

  async function handleUploadFile(file: File, kind: string, songId: number | null = null) {
    setUploadingKind(kind);
    try {
      let width: number | null = null;
      let height: number | null = null;
      if (kind === "foto_artista" || kind === "portada") {
        const dims = await imageDimensions(file);
        width = dims.width;
        height = dims.height;
      }
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/rizzvor/upload",
        clientPayload: kind,
      });
      const res = await fetch(`/api/rizzvor/projects/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          kind,
          url: blob.url,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          width,
          height,
        }),
      });
      const data = await res.json();
      if (songId && data.file) {
        const field = kind === "audio_wav" ? "audioWavFileId" : kind === "audio_preview" ? "audioPreviewFileId" : kind === "portada" ? "portadaFileId" : null;
        if (field) {
          await fetch(`/api/rizzvor/projects/${id}/songs/${songId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: data.file.id }),
          });
        }
      }
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleRemoveFile(fileId: number) {
    await fetch(`/api/rizzvor/projects/${id}/files/${fileId}`, { method: "DELETE" });
    reload();
  }

  async function handleAddSong(fonograma: string) {
    if (!fonograma.trim()) return;
    await fetch(`/api/rizzvor/projects/${id}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fonograma, artistPrincipal: bundle?.project.artistName ?? null }),
    });
    reload();
  }

  async function handleSongStatus(songId: number, status: string) {
    await fetch(`/api/rizzvor/projects/${id}/songs/${songId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status || null }),
    });
    reload();
  }

  async function handleDeleteSong(songId: number) {
    await fetch(`/api/rizzvor/projects/${id}/songs/${songId}`, { method: "DELETE" });
    reload();
  }

  function playFrom(kind: "audio_wav" | "audio_preview", startSongId?: number) {
    if (!bundle) return;
    const tracks: PlayerTrack[] = [];
    for (const song of bundle.songs) {
      const fileId = kind === "audio_wav" ? song.audioWavFileId : song.audioPreviewFileId;
      const file = bundle.files.find((f) => f.id === fileId);
      if (file) tracks.push({ url: file.url, name: song.fonograma, subtitle: kind === "audio_wav" ? "Master" : "Preview" });
    }
    for (const file of bundle.files.filter((f) => !f.songId && (f.kind === "audio_wav" || f.kind === "audio_preview"))) {
      tracks.push({ url: file.url, name: file.fileName || "Audio", subtitle: file.kind === "audio_wav" ? "Master" : "Preview" });
    }
    if (tracks.length === 0) return;
    const startIndex = startSongId
      ? bundle.songs.findIndex((s) => s.id === startSongId && (kind === "audio_wav" ? s.audioWavFileId : s.audioPreviewFileId))
      : 0;
    setNowPlaying({ tracks, index: Math.max(0, startIndex) });
  }

  if (error) return <div className="rzd-root bg-atmosphere"><div className="rzd-inner"><p className="rzd-empty">Error: {error}</p></div></div>;
  if (!bundle) return <div className="rzd-root bg-atmosphere"><div className="rzd-inner"><p className="rzd-empty">Cargando...</p></div></div>;

  const { project, songs, files, checklist } = bundle;
  const projectLevelFiles = (kind: string) => files.filter((f) => !f.songId && f.kind === kind);

  return (
    <div className="rzd-root bg-atmosphere">
      <style>{`
        .rzd-root { font-family: var(--font-display); color: var(--text-1); min-height: 100vh; padding-bottom: 6rem; }
        .rzd-topbar { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 2rem; }
        .rzd-signout { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 7px 14px; color: var(--text-2); cursor: pointer; font-size: 12.5px; }
        .rzd-inner { max-width: 980px; margin: 0 auto; padding: 0 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .rzd-back { font-size: 12.5px; color: var(--text-3); text-decoration: none; }
        .rzd-empty { color: var(--text-3); text-align: center; padding: 3rem 0; }
        .card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.4rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
        .card-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: .07em; font-weight: 500; }

        .rzd-header { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
        .rzd-avatar-wrap { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
        .rzd-avatar-img { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; }
        .rzd-avatar-fallback { width: 80px; height: 80px; border-radius: 16px; background: var(--accent-gradient); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 26px; }
        .rzd-avatar-upload { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .rzd-name { font-size: 24px; font-weight: 700; margin: 0; }
        .rzd-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .rzd-chip { font-size: 11.5px; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 100px; padding: 4px 11px; color: var(--text-2); }
        .rzd-chip select, .rzd-chip input { background: transparent; border: none; color: inherit; font: inherit; font-size: 11.5px; }
        .rzd-status-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .rzd-status-select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 12px; color: var(--text-1); font-size: 13px; font-weight: 600; }

        table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        th { text-align: left; color: var(--text-3); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
        td { padding: 8px 10px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
        .rzd-song-status { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 6px; padding: 4px 8px; color: var(--text-1); font-size: 11.5px; }
        .rzd-attach { font-size: 11px; }
        .rzd-attach.ok { color: var(--good); }
        .rzd-attach.missing { color: var(--crit); }
        .rzd-play-btn { background: transparent; border: 1px solid var(--line-soft); border-radius: 6px; padding: 3px 8px; color: var(--text-2); cursor: pointer; font-size: 11px; }
        .rzd-del-btn { background: transparent; border: none; color: var(--crit); cursor: pointer; font-size: 11.5px; }
        .rzd-add-song { display: flex; gap: 8px; margin-top: 10px; }
        .rzd-add-song input { flex: 1; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 11px; color: var(--text-1); font-size: 13px; }
        .rzd-add-song button { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 8px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 12.5px; }

        .rzd-files-groups { display: flex; flex-direction: column; gap: 16px; }
        .rzd-files-group h3 { font-size: 12.5px; font-weight: 700; margin: 0 0 8px; }
        .rzd-file-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line-soft); font-size: 12px; }
        .rzd-file-row:last-child { border-bottom: none; }
        .rzd-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .rzd-file-dims { color: var(--text-3); font-size: 10.5px; }
        .rzd-upload-btn { display: inline-block; background: transparent; border: 1px dashed var(--line-soft); border-radius: 8px; padding: 7px 13px; color: var(--text-2); cursor: pointer; font-size: 11.5px; margin-top: 6px; }
        .rzd-upload-btn input { display: none; }
      `}</style>

      <div className="rzd-topbar">
        <Link href={`/sellos/${encodeURIComponent(project.sello)}?tab=proyectos`} className="rzd-back">← Volver a Proyectos</Link>
        <button className="rzd-signout" onClick={() => signOut({ callbackUrl: "/" })}>Cerrar sesión</button>
      </div>

      <div className="rzd-inner">
        <div className="card rzd-header">
          <div className="rzd-avatar-wrap">
            {project.artistPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.artistPhotoUrl} alt={project.artistName} className="rzd-avatar-img" />
            ) : (
              <div className="rzd-avatar-fallback">{project.artistName.slice(0, 2).toUpperCase()}</div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="rzd-avatar-upload"
              title="Cambiar foto"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f, "foto_artista");
                e.target.value = "";
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 className="rzd-name">{project.artistName}</h1>
            <div className="rzd-chips">
              <span className="rzd-chip">
                <select value={project.sello} onChange={(e) => patchProject({ sello: e.target.value })}>
                  {SELLOS.filter((s) => s !== "Streamings").map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </span>
              <span className="rzd-chip">
                <select value={project.genero ?? ""} onChange={(e) => patchProject({ genero: e.target.value || null })}>
                  <option value="">Sin género</option>
                  {GENEROS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </span>
              <span className="rzd-chip">
                <select value={project.priority} onChange={(e) => patchProject({ priority: e.target.value })}>
                  {RIZZVOR_PROJECT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </span>
              <span className="rzd-chip">
                <input
                  placeholder="Responsable"
                  onBlur={(e) => patchProject({ responsableEmail: e.target.value || null })}
                  defaultValue={project.responsableEmail ?? ""}
                  key={project.responsableEmail}
                />
              </span>
              <span className="rzd-chip">
                <input
                  type="date"
                  defaultValue={project.fechaEstimada ? project.fechaEstimada.slice(0, 10) : ""}
                  onBlur={(e) => patchProject({ fechaEstimada: e.target.value || null })}
                  key={project.fechaEstimada}
                />
              </span>
            </div>
            <div className="rzd-status-row">
              <select
                className="rzd-status-select"
                value={project.status}
                onChange={(e) => patchProject({ status: e.target.value })}
              >
                {RIZZVOR_PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ConvertButton project={project} songs={songs} files={files} onConverted={reload} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-label">Canciones</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fonograma</th>
                <th>Estado</th>
                <th>WAV</th>
                <th>Portada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song.id}>
                  <td>{song.trackNumber}</td>
                  <td>{song.fonograma}</td>
                  <td>
                    <select
                      className="rzd-song-status"
                      value={song.status ?? ""}
                      onChange={(e) => handleSongStatus(song.id, e.target.value)}
                    >
                      <option value="">Usa el estado del proyecto</option>
                      {RIZZVOR_PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`rzd-attach ${song.audioWavFileId ? "ok" : "missing"}`}>
                      {song.audioWavFileId ? "✓" : "✗"}
                    </span>
                    {song.audioWavFileId && (
                      <button className="rzd-play-btn" style={{ marginLeft: 6 }} onClick={() => playFrom("audio_wav", song.id)}>▶</button>
                    )}
                  </td>
                  <td>
                    <span className={`rzd-attach ${song.portadaFileId ? "ok" : "missing"}`}>
                      {song.portadaFileId ? "✓" : "✗"}
                    </span>
                  </td>
                  <td>
                    <button className="rzd-del-btn" onClick={() => handleDeleteSong(song.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {songs.length === 0 && (
                <tr><td colSpan={6} style={{ color: "var(--text-3)", textAlign: "center" }}>Sin canciones todavía.</td></tr>
              )}
            </tbody>
          </table>
          <AddSongRow onAdd={handleAddSong} />
        </div>

        <div className="card">
          <div className="card-label">Archivos</div>
          <div className="rzd-files-groups">
            {RIZZVOR_FILE_KINDS.filter((k) => k !== "foto_artista").map((kind) => (
              <div className="rzd-files-group" key={kind}>
                <h3>{FILE_KIND_LABELS[kind]}</h3>
                {projectLevelFiles(kind).map((f) => (
                  <div className="rzd-file-row" key={f.id}>
                    <span className="rzd-file-name">{f.fileName || f.url}</span>
                    {f.width && f.height && <span className="rzd-file-dims">{f.width}×{f.height}</span>}
                    {(kind === "audio_wav" || kind === "audio_preview") && (
                      <button className="rzd-play-btn" onClick={() => setNowPlaying({ tracks: [{ url: f.url, name: f.fileName || "Audio" }], index: 0 })}>▶</button>
                    )}
                    <button className="rzd-del-btn" onClick={() => handleRemoveFile(f.id)}>Eliminar</button>
                  </div>
                ))}
                {projectLevelFiles(kind).length === 0 && (
                  <div className="rzd-file-row" style={{ color: "var(--text-3)" }}>Sin archivos.</div>
                )}
                <label className="rzd-upload-btn">
                  {uploadingKind === kind ? "Subiendo..." : "+ Subir archivo"}
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadFile(f, kind);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <ChecklistSection projectId={id} items={checklist} onChange={reload} />
        <CommentsSection projectId={id} />
        <HistorySection projectId={id} />
      </div>

      {nowPlaying && (
        <AudioPlayerBar
          tracks={nowPlaying.tracks}
          startIndex={nowPlaying.index}
          onClose={() => setNowPlaying(null)}
        />
      )}
    </div>
  );
}

function AddSongRow({ onAdd }: { onAdd: (fonograma: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="rzd-add-song">
      <input
        value={value}
        placeholder="Nombre de la canción..."
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(value);
            setValue("");
          }
        }}
      />
      <button
        onClick={() => {
          onAdd(value);
          setValue("");
        }}
      >
        + Agregar canción
      </button>
    </div>
  );
}
