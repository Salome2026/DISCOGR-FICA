"use client";

import { useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import porCompania from "@/data/por_compania.json";
import { assignSello, SELLOS } from "@/lib/sellos";

const distribuidoras = [
  ...(porCompania as { companies: { company: string }[] }).companies
    .map((c) => c.company)
    .filter((c) => c !== "Sin datos"),
  "Sin definir",
];

const ESTADOS = ["Contactado", "Firmado", "Necesito ayuda"] as const;
const PORTADA_SIZE = 3000;
const TIPOS = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Álbum" },
] as const;
type Tipo = (typeof TIPOS)[number]["value"] | "";

type Props = {
  role: "admin" | "project_manager";
  assignedArtists: string[] | null; // null = admin, sees all
  onClose: () => void;
  onCreated: () => void;
};

type TrackDraft = {
  key: string;
  fonograma: string;
  artistaPrincipal: string;
  colaboradores: string;
  productor: string;
  comentario: string;
  audioFile: File | null;
  portadaFile: File | null;
  collapsed: boolean;
};

let trackKeySeq = 0;
function newTrackKey() {
  trackKeySeq += 1;
  return `t${trackKeySeq}`;
}

function emptyTrack(artistaPrincipal: string): TrackDraft {
  return {
    key: newTrackKey(),
    fonograma: "",
    artistaPrincipal,
    colaboradores: "",
    productor: "",
    comentario: "",
    audioFile: null,
    portadaFile: null,
    collapsed: false,
  };
}

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

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function cancionPlural(n: number): string {
  return n === 1 ? "canción" : "canciones";
}

export default function NuevoLanzamientoForm({ onClose, onCreated }: Props) {
  const [tipo, setTipo] = useState<Tipo>("");

  const [artist, setArtist] = useState("");
  const [sello, setSello] = useState("");
  const [selloTouched, setSelloTouched] = useState(false);
  const [streamingProjects, setStreamingProjects] = useState<string[]>([]);
  const [streamingProject, setStreamingProject] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("Contactado");
  const [distribuidora, setDistribuidora] = useState("");
  const [fecha, setFecha] = useState("");

  // Single-only
  const [fonograma, setFonograma] = useState("");
  const [autores, setAutores] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [portadaFile, setPortadaFile] = useState<File | null>(null);

  // EP/álbum-only
  const [groupNombre, setGroupNombre] = useState("");
  const [comentariosGrupo, setComentariosGrupo] = useState("");
  const [tracks, setTracks] = useState<TrackDraft[]>([]);

  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isGrouped = tipo === "ep" || tipo === "album";

  useEffect(() => {
    if (isGrouped && tracks.length === 0) {
      setTracks([emptyTrack(artist)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGrouped]);

  useEffect(() => {
    fetch("/api/streaming-projects")
      .then((r) => r.json())
      .then((d) => !d.error && setStreamingProjects(d.projects.map((p: { name: string }) => p.name)))
      .catch(() => {});
  }, []);

  function onSelloChange(v: string) {
    setSello(v);
    setSelloTouched(true);
    if (v !== "Streamings") setStreamingProject("");
  }

  function onArtistChange(v: string) {
    setArtist(v);
    if (!selloTouched) {
      const suggested = assignSello(v);
      if (suggested) setSello(suggested);
    }
  }

  async function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setAudioFile(null);
      return;
    }
    const isWav = f.type === "audio/wav" || f.type === "audio/x-wav" || /\.wav$/i.test(f.name);
    if (!isWav) {
      setFileError("El audio tiene que ser un archivo .wav.");
      e.target.value = "";
      setAudioFile(null);
      return;
    }
    setAudioFile(f);
  }

  async function handlePortadaChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setPortadaFile(null);
      return;
    }
    try {
      const { width, height } = await imageDimensions(f);
      if (width !== PORTADA_SIZE || height !== PORTADA_SIZE) {
        setFileError(`La portada tiene que ser exactamente ${PORTADA_SIZE}x${PORTADA_SIZE}px (subiste ${width}x${height}px).`);
        e.target.value = "";
        setPortadaFile(null);
        return;
      }
      setPortadaFile(f);
    } catch {
      setFileError("No se pudo leer la imagen. Probá con otro archivo.");
      e.target.value = "";
      setPortadaFile(null);
    }
  }

  function updateTrack(key: string, patch: Partial<TrackDraft>) {
    setTracks((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function addTrack() {
    setTracks((prev) => [...prev, emptyTrack(artist)]);
  }

  function duplicateTrack(key: string) {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.key === key);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], key: newTrackKey(), fonograma: prev[idx].fonograma ? `${prev[idx].fonograma} (copia)` : "" };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }

  function removeTrack(key: string) {
    setTracks((prev) => prev.filter((t) => t.key !== key));
  }

  function moveTrack(key: string, dir: -1 | 1) {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.key === key);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  async function handleTrackAudioChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      updateTrack(key, { audioFile: null });
      return;
    }
    const isWav = f.type === "audio/wav" || f.type === "audio/x-wav" || /\.wav$/i.test(f.name);
    if (!isWav) {
      setFileError("El audio tiene que ser un archivo .wav.");
      e.target.value = "";
      updateTrack(key, { audioFile: null });
      return;
    }
    updateTrack(key, { audioFile: f });
  }

  async function handleTrackPortadaChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      updateTrack(key, { portadaFile: null });
      return;
    }
    try {
      const { width, height } = await imageDimensions(f);
      if (width !== PORTADA_SIZE || height !== PORTADA_SIZE) {
        setFileError(`La portada tiene que ser exactamente ${PORTADA_SIZE}x${PORTADA_SIZE}px (subiste ${width}x${height}px).`);
        e.target.value = "";
        updateTrack(key, { portadaFile: null });
        return;
      }
      updateTrack(key, { portadaFile: f });
    } catch {
      setFileError("No se pudo leer la imagen. Probá con otro archivo.");
      e.target.value = "";
      updateTrack(key, { portadaFile: null });
    }
  }

  const incompleteTracks = useMemo(
    () => tracks.filter((t) => !t.fonograma.trim() || !t.artistaPrincipal.trim()),
    [tracks]
  );
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tracks) {
      const n = norm(t.fonograma);
      if (!n) continue;
      counts.set(n, (counts.get(n) || 0) + 1);
    }
    return [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);
  }, [tracks]);

  async function uploadTrackFiles(t: TrackDraft, idx: number, total: number) {
    let audioUrl: string | null = null;
    let portadaUrl: string | null = null;
    if (t.audioFile) {
      setUploadStep(`Subiendo audio ${idx + 1}/${total}...`);
      const blob = await upload(t.audioFile.name, t.audioFile, {
        access: "public",
        handleUploadUrl: "/api/pm/upload",
        clientPayload: "audio",
      });
      audioUrl = blob.url;
    }
    if (t.portadaFile) {
      setUploadStep(`Subiendo portada ${idx + 1}/${total}...`);
      const blob = await upload(t.portadaFile.name, t.portadaFile, {
        access: "public",
        handleUploadUrl: "/api/pm/upload",
        clientPayload: "portada",
      });
      portadaUrl = blob.url;
    }
    return { audioUrl, portadaUrl };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tipo) {
      setError("Elegí el tipo de lanzamiento.");
      return;
    }
    if (!artist.trim()) {
      setError("Completá el nombre del artista.");
      return;
    }
    if (!sello) {
      setError("Elegí el sello / unidad de negocio.");
      return;
    }
    if (sello === "Streamings" && !streamingProject) {
      setError("Elegí el proyecto de streaming.");
      return;
    }

    if (tipo === "single") {
      if (!fonograma.trim()) {
        setError("El nombre del fonograma es obligatorio.");
        return;
      }

      setSaving(true);
      try {
        let audioUrl: string | null = null;
        let portadaUrl: string | null = null;
        if (audioFile) {
          setUploadStep("Subiendo audio...");
          const blob = await upload(audioFile.name, audioFile, {
            access: "public",
            handleUploadUrl: "/api/pm/upload",
            clientPayload: "audio",
          });
          audioUrl = blob.url;
        }
        if (portadaFile) {
          setUploadStep("Subiendo portada...");
          const blob = await upload(portadaFile.name, portadaFile, {
            access: "public",
            handleUploadUrl: "/api/pm/upload",
            clientPayload: "portada",
          });
          portadaUrl = blob.url;
        }
        setUploadStep(null);

        const res = await fetch("/api/pm/releases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "single",
            artist,
            sello,
            streamingProject: sello === "Streamings" ? streamingProject : null,
            fonograma,
            estado,
            distribuidora: distribuidora || null,
            fecha: fecha || null,
            autoresCompositores: autores || null,
            audioUrl,
            portadaUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
        setSuccess(true);
        setTimeout(() => onCreated(), 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setSaving(false);
        setUploadStep(null);
      }
      return;
    }

    // EP / álbum
    if (!groupNombre.trim()) {
      setError(`El nombre del ${tipo === "ep" ? "EP" : "álbum"} es obligatorio.`);
      return;
    }
    if (tracks.length === 0) {
      setError("Agregá al menos una canción.");
      return;
    }
    if (incompleteTracks.length > 0) {
      setError(
        `Faltan datos en ${incompleteTracks.length} ${cancionPlural(incompleteTracks.length)} (nombre y artista principal son obligatorios).`
      );
      return;
    }

    setSaving(true);
    try {
      const uploaded: { audioUrl: string | null; portadaUrl: string | null }[] = [];
      for (let i = 0; i < tracks.length; i++) {
        uploaded.push(await uploadTrackFiles(tracks[i], i, tracks.length));
      }
      setUploadStep(null);

      const res = await fetch("/api/pm/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          artist,
          sello,
          streamingProject: sello === "Streamings" ? streamingProject : null,
          nombre: groupNombre,
          estado,
          distribuidora: distribuidora || null,
          fecha: fecha || null,
          comentarios: comentariosGrupo || null,
          tracks: tracks.map((t, i) => ({
            trackNumber: i + 1,
            fonograma: t.fonograma,
            artist: t.artistaPrincipal,
            colaboradores: t.colaboradores || null,
            productor: t.productor || null,
            comentario: t.comentario || null,
            audioUrl: uploaded[i].audioUrl,
            portadaUrl: uploaded[i].portadaUrl,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      setSuccess(true);
      setTimeout(() => onCreated(), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
      setUploadStep(null);
    }
  }

  const modalWidth = isGrouped ? 720 : 480;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: "var(--glass-bg-strong)",
          backdropFilter: "blur(40px) saturate(1.7)",
          WebkitBackdropFilter: "blur(40px) saturate(1.7)",
          color: "var(--text-1)",
          borderRadius: 16,
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-glass-lg)",
          width: "100%",
          maxWidth: modalWidth,
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>+ Nuevo lanzamiento</div>

        <div>
          <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Tipo de lanzamiento</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 8,
                  border: tipo === t.value ? "1px solid var(--accent-color)" : "1px solid var(--line-soft)",
                  background: tipo === t.value ? "rgba(63,198,209,0.15)" : "var(--bg-2)",
                  color: tipo === t.value ? "var(--accent-color)" : "var(--text-2)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tipo && (
          <>
            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Artista</label>
              <input
                value={artist}
                onChange={(e) => onArtistChange(e.target.value)}
                placeholder="Nombre del artista"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Sello / unidad de negocio</label>
              <select
                value={sello}
                onChange={(e) => onSelloChange(e.target.value)}
                style={inputStyle}
              >
                <option value="">Elegir...</option>
                {SELLOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {sello === "Streamings" && (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Seleccionar streaming</label>
                <select
                  value={streamingProject}
                  onChange={(e) => setStreamingProject(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Elegir...</option>
                  {streamingProjects.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {tipo === "single" ? (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Nombre del fonograma</label>
                <input
                  value={fonograma}
                  onChange={(e) => setFonograma(e.target.value)}
                  placeholder="Nombre del single"
                  style={inputStyle}
                />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                  Nombre del {tipo === "ep" ? "EP" : "álbum"}
                </label>
                <input
                  value={groupNombre}
                  onChange={(e) => setGroupNombre(e.target.value)}
                  placeholder={`Nombre del ${tipo === "ep" ? "EP" : "álbum"}`}
                  style={inputStyle}
                />
              </div>
            )}

            {tipo === "single" && (
              <div>
                <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Autores y compositores</label>
                <input
                  value={autores}
                  onChange={(e) => setAutores(e.target.value)}
                  placeholder="Nombre y apellido de cada uno, separados por coma"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Estado del release</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} style={inputStyle}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Distribuidora</label>
              <select value={distribuidora} onChange={(e) => setDistribuidora(e.target.value)} style={inputStyle}>
                <option value="">Elegir...</option>
                {distribuidoras.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Fecha de lanzamiento</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
            </div>

            {tipo === "single" ? (
              <>
                <div>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Audio (.wav)</label>
                  <input type="file" accept=".wav,audio/wav" onChange={handleAudioChange} style={fileInputStyle} />
                  {audioFile && <p style={{ fontSize: 11.5, color: "var(--good)", marginTop: 4 }}>✓ {audioFile.name}</p>}
                </div>
                <div>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                    Portada ({PORTADA_SIZE}x{PORTADA_SIZE}px, para Spotify)
                  </label>
                  <input type="file" accept="image/png,image/jpeg" onChange={handlePortadaChange} style={fileInputStyle} />
                  {portadaFile && <p style={{ fontSize: 11.5, color: "var(--good)", marginTop: 4 }}>✓ {portadaFile.name}</p>}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>Comentarios u observaciones</label>
                  <textarea
                    value={comentariosGrupo}
                    onChange={(e) => setComentariosGrupo(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>
                    Canciones del lanzamiento
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
                    {tracks.length} {cancionPlural(tracks.length)} cargada{tracks.length === 1 ? "" : "s"}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tracks.map((t, i) => (
                      <div
                        key={t.key}
                        style={{
                          border: "1px solid var(--line-soft)",
                          borderRadius: 10,
                          background: "var(--bg-2)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                          onClick={() => updateTrack(t.key, { collapsed: !t.collapsed })}
                        >
                          <span style={{ fontSize: 12, color: "var(--text-3)", width: 20 }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                            {t.fonograma || "Sin nombre todavía"}
                            {(!t.fonograma.trim() || !t.artistaPrincipal.trim()) && (
                              <span style={{ color: "var(--warn)", fontWeight: 500, fontSize: 11.5 }}> · incompleta</span>
                            )}
                          </span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveTrack(t.key, -1); }} disabled={i === 0} style={miniBtnStyle(i === 0)}>↑</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveTrack(t.key, 1); }} disabled={i === tracks.length - 1} style={miniBtnStyle(i === tracks.length - 1)}>↓</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); duplicateTrack(t.key); }} style={miniBtnStyle(false)} title="Duplicar">⧉</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeTrack(t.key); }} disabled={tracks.length === 1} style={miniBtnStyle(tracks.length === 1)} title="Eliminar">×</button>
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{t.collapsed ? "▸" : "▾"}</span>
                        </div>

                        {!t.collapsed && (
                          <div style={{ padding: "0 10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div>
                              <label style={smallLabel}>Nombre de la canción</label>
                              <input
                                value={t.fonograma}
                                onChange={(e) => updateTrack(t.key, { fonograma: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={smallLabel}>Artista principal</label>
                              <input
                                value={t.artistaPrincipal}
                                onChange={(e) => updateTrack(t.key, { artistaPrincipal: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={smallLabel}>Artistas invitados / colaboradores</label>
                              <input
                                value={t.colaboradores}
                                onChange={(e) => updateTrack(t.key, { colaboradores: e.target.value })}
                                placeholder="Separados por coma"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={smallLabel}>Productor (si corresponde)</label>
                              <input
                                value={t.productor}
                                onChange={(e) => updateTrack(t.key, { productor: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={smallLabel}>Audio (.wav) — estado: {t.audioFile ? "Cargado" : "Pendiente"}</label>
                              <input type="file" accept=".wav,audio/wav" onChange={(e) => handleTrackAudioChange(t.key, e)} style={fileInputStyle} />
                            </div>
                            <div>
                              <label style={smallLabel}>
                                Portada, si aplica ({PORTADA_SIZE}x{PORTADA_SIZE}px) — estado: {t.portadaFile ? "Cargada" : "Pendiente"}
                              </label>
                              <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleTrackPortadaChange(t.key, e)} style={fileInputStyle} />
                            </div>
                            <div>
                              <label style={smallLabel}>Comentario u observación</label>
                              <input
                                value={t.comentario}
                                onChange={(e) => updateTrack(t.key, { comentario: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addTrack}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "9px 0",
                      borderRadius: 8,
                      border: "1px dashed var(--line-soft)",
                      background: "transparent",
                      color: "var(--text-2)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    + Agregar canción
                  </button>
                </div>

                <div
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 12.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div>Total de canciones: <strong>{tracks.length}</strong></div>
                  <div style={{ color: incompleteTracks.length ? "var(--crit-ink)" : "var(--text-3)" }}>
                    Con información incompleta: <strong>{incompleteTracks.length}</strong>
                  </div>
                  {duplicateNames.length > 0 && (
                    <div style={{ color: "var(--warn-ink)" }}>
                      Nombres duplicados: {duplicateNames.join(", ")}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {fileError && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>
            {fileError}
          </div>
        )}
        {error && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "var(--good-bg)", color: "var(--good-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
            Lanzamiento guardado y actualizado en el catálogo correctamente.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--line-soft)",
              borderRadius: 8,
              padding: "8px 16px",
              color: "var(--text-2)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !tipo}
            style={{
              background: "var(--accent-glass-bg)",
              border: "1px solid var(--accent-glass-border)",
              borderRadius: 8,
              padding: "8px 16px",
              color: "var(--text-1)",
              fontWeight: 600,
              backdropFilter: "blur(20px) saturate(1.7)",
              WebkitBackdropFilter: "blur(20px) saturate(1.7)",
              cursor: saving || !tipo ? "default" : "pointer",
              fontSize: 13,
              opacity: saving || !tipo ? 0.6 : 1,
            }}
          >
            {saving
              ? uploadStep ?? "Guardando..."
              : isGrouped
              ? `Confirmar y guardar ${tipo === "ep" ? "EP" : "álbum"} (${tracks.length} ${cancionPlural(tracks.length)})`
              : "Guardar lanzamiento"}
          </button>
        </div>
      </form>
    </div>
  );
}

const smallLabel: React.CSSProperties = { fontSize: 11.5, color: "var(--text-3)" };

function miniBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid var(--line-soft)",
    borderRadius: 6,
    width: 22,
    height: 22,
    fontSize: 12,
    color: disabled ? "var(--line)" : "var(--text-2)",
    cursor: disabled ? "default" : "pointer",
    lineHeight: 1,
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-1)",
  fontSize: 13,
  marginTop: 4,
};

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "6px 8px",
};
