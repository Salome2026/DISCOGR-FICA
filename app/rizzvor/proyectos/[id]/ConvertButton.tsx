"use client";

import Link from "next/link";
import { useState } from "react";
import porCompania from "@/data/por_compania.json";
import type { RizzvorProject, RizzvorProjectSong, RizzvorProjectFile } from "@/lib/db/rizzvorProjects";

const distribuidoras = [
  ...(porCompania as { companies: { company: string }[] }).companies
    .map((c) => c.company)
    .filter((c) => c !== "Sin datos"),
  "Sin definir",
];

const ESTADOS = ["Contactado", "Firmado", "Necesito ayuda"] as const;
const PORTADA_SIZE = 3000;

export default function ConvertButton({
  project,
  songs,
  files,
  onConverted,
}: {
  project: RizzvorProject;
  songs: RizzvorProjectSong[];
  files: RizzvorProjectFile[];
  onConverted: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (project.convertedAt) {
    return (
      <Link href="/pm" className="rzd-convert-link">
        ✓ Convertido — ver en PM
      </Link>
    );
  }

  if (project.status !== "Listo para distribuir") return null;

  return (
    <>
      <style>{`
        .rzd-convert-btn { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 12.5px; }
        .rzd-convert-link { font-size: 12.5px; font-weight: 600; color: var(--good); text-decoration: none; }
      `}</style>
      <button className="rzd-convert-btn" onClick={() => setOpen(true)}>Convertir a lanzamiento</button>
      {open && (
        <ConvertModal
          project={project}
          songs={songs}
          files={files}
          onClose={() => setOpen(false)}
          onConverted={() => {
            setOpen(false);
            onConverted();
          }}
        />
      )}
    </>
  );
}

function ConvertModal({
  project,
  songs,
  files,
  onClose,
  onConverted,
}: {
  project: RizzvorProject;
  songs: RizzvorProjectSong[];
  files: RizzvorProjectFile[];
  onClose: () => void;
  onConverted: () => void;
}) {
  const fileById = new Map(files.map((f) => [f.id, f]));
  const problems: string[] = [];
  for (const song of songs) {
    const wav = song.audioWavFileId ? fileById.get(song.audioWavFileId) : null;
    if (!wav) problems.push(`"${song.fonograma}": falta el audio WAV.`);
    const portada = song.portadaFileId ? fileById.get(song.portadaFileId) : null;
    if (!portada) problems.push(`"${song.fonograma}": falta la portada.`);
    else if (portada.width !== PORTADA_SIZE || portada.height !== PORTADA_SIZE) {
      problems.push(`"${song.fonograma}": portada ${portada.width}x${portada.height}px, necesita ${PORTADA_SIZE}x${PORTADA_SIZE}px.`);
    }
  }

  const [distribuidora, setDistribuidora] = useState(project.distribuidora ?? "");
  const [fecha, setFecha] = useState(project.fechaEstimada ? project.fechaEstimada.slice(0, 10) : "");
  const [hora, setHora] = useState(project.horaEstimada ?? "20:00");
  const [estado, setEstado] = useState<string>("Firmado");
  const [tipoOverride, setTipoOverride] = useState<"single" | "ep" | "album">(songs.length === 1 ? "single" : "ep");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = problems.length === 0 && !!distribuidora && !!fecha;

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/rizzvor/projects/${project.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distribuidora, fecha, hora, estado, tipoOverride }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo convertir el proyecto.");
      setSaving(false);
      return;
    }
    onConverted();
  }

  return (
    <div className="rzcv-overlay" onClick={onClose}>
      <style>{`
        .rzcv-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 110; display: flex; align-items: center; justify-content: center; padding: 2rem; overflow-y: auto; }
        .rzcv-modal { background: var(--glass-bg-strong); backdrop-filter: blur(40px) saturate(1.7); -webkit-backdrop-filter: blur(40px) saturate(1.7); color: var(--text-1); border-radius: 16px; border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass-lg); width: 100%; max-width: 520px; padding: 1.5rem; display: flex; flex-direction: column; gap: 12px; }
        .rzcv-modal h2 { font-size: 18px; font-weight: 700; margin: 0; }
        .rzcv-problems { background: var(--crit-bg); color: var(--crit-ink); border-radius: 8px; padding: 10px 12px; font-size: 12px; line-height: 1.6; }
        .rzcv-field { display: flex; flex-direction: column; gap: 4px; }
        .rzcv-field label { font-size: 11.5px; color: var(--text-3); }
        .rzcv-field input, .rzcv-field select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 11px; color: var(--text-1); font-size: 13px; }
        .rzcv-row { display: flex; gap: 10px; }
        .rzcv-row .rzcv-field { flex: 1; }
        .rzcv-song-list { font-size: 12px; color: var(--text-2); display: flex; flex-direction: column; gap: 3px; }
        .rzcv-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
        .rzcv-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 14px; color: var(--text-2); cursor: pointer; font-size: 13px; }
        .rzcv-btn-primary { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13px; }
        .rzcv-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
      <div className="rzcv-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Convertir a lanzamiento</h2>

        {problems.length > 0 && (
          <div className="rzcv-problems">
            {problems.map((p) => <div key={p}>• {p}</div>)}
          </div>
        )}

        <div className="rzcv-song-list">
          <strong>{project.artistName}</strong>
          {songs.map((s) => <span key={s.id}>— {s.fonograma}</span>)}
        </div>

        {songs.length > 1 && (
          <div className="rzcv-field">
            <label>Tipo</label>
            <select value={tipoOverride} onChange={(e) => setTipoOverride(e.target.value as "ep" | "album")}>
              <option value="ep">EP</option>
              <option value="album">Álbum</option>
            </select>
          </div>
        )}

        <div className="rzcv-row">
          <div className="rzcv-field">
            <label>Distribuidora *</label>
            <select value={distribuidora} onChange={(e) => setDistribuidora(e.target.value)}>
              <option value="">Elegir...</option>
              {distribuidoras.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="rzcv-field">
            <label>Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS.map((e2) => <option key={e2} value={e2}>{e2}</option>)}
            </select>
          </div>
        </div>
        <div className="rzcv-row">
          <div className="rzcv-field">
            <label>Fecha *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="rzcv-field">
            <label>Hora</label>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>

        {error && <p style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</p>}

        <div className="rzcv-actions">
          <button className="rzcv-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="rzcv-btn-primary" disabled={!canSubmit || saving} onClick={handleConfirm}>
            {saving ? "Convirtiendo..." : "Confirmar y crear lanzamiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
