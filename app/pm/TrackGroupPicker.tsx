"use client";

import type { ReactNode } from "react";
import type { SplitTrackOption } from "@discografica/shared/types/editorialSplits";
import { TrackPicker } from "./TrackPicker";

export type CargaTipo = "fonograma" | "ep" | "album";

export const TRACK_GROUP_PICKER_STYLES = `
  .tgp-tipo-tabs { display:flex; gap:6px; margin-bottom:14px; }
  .tgp-tipo-tab { flex:1; background:var(--bg-1); border:1px solid var(--line-soft); border-radius:8px; padding:10px; color:var(--text-2); cursor:pointer; font-size:13px; font-weight:600; text-align:center; }
  .tgp-tipo-tab:hover { border-color:var(--accent-color); }
  .tgp-tipo-tab.active { background:var(--accent-glass-bg); border-color:var(--accent-color); color:var(--text-1); }
  .tgp-track-row { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; background:var(--bg-1); border:1px solid var(--line-soft); border-radius:10px; padding:12px; }
  .tgp-track-row-main { flex:1; min-width:0; }
  .tgp-track-remove { background:transparent; border:none; color:var(--text-3); cursor:pointer; font-size:18px; line-height:1; padding:8px 4px; }
  .tgp-track-remove:hover { color:var(--crit-ink); }
  .tgp-add-track { background:transparent; border:1px dashed var(--line-soft); border-radius:8px; padding:9px 14px; color:var(--text-2); cursor:pointer; font-size:13px; width:100%; text-align:left; }
  .tgp-add-track:hover { border-color:var(--accent-color); color:var(--text-1); }
`;

const TIPO_LABELS: Record<CargaTipo, string> = {
  fonograma: "Fonograma",
  ep: "EP",
  album: "Álbum",
};

// Fonograma: una sola canción, igual que siempre. EP/Álbum: una lista de
// canciones (cada una buscada o tipeada igual que un fonograma suelto).
// Las mutaciones de la lista (agregar/quitar/elegir) se hacen acá con
// callbacks por índice, en vez de recibir el array entero y devolverlo
// modificado — así quien use este componente (ej. Split editorial, para
// mantener un archivo de letra propio por canción) puede mantener sus
// propios arrays paralelos sincronizados por índice sin adivinar qué fila
// se agregó o se quitó.
export function TrackGroupPicker({
  tipo,
  onTipoChange,
  tracks,
  onSelectTrack,
  onAddTrack,
  onRemoveTrack,
  renderExtra,
}: {
  tipo: CargaTipo;
  onTipoChange: (t: CargaTipo) => void;
  tracks: (SplitTrackOption | null)[];
  onSelectTrack: (index: number, t: SplitTrackOption | null) => void;
  onAddTrack: () => void;
  onRemoveTrack: (index: number) => void;
  // Contenido extra por canción (ej. su propio documento de letra) —
  // renderizado justo debajo del picker de cada fila, solo en modo EP/Álbum.
  renderExtra?: (index: number) => ReactNode;
}) {
  return (
    <div>
      <style>{TRACK_GROUP_PICKER_STYLES}</style>
      <div className="tgp-tipo-tabs">
        {(["fonograma", "ep", "album"] as CargaTipo[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tgp-tipo-tab ${tipo === t ? "active" : ""}`}
            onClick={() => onTipoChange(t)}
          >
            {TIPO_LABELS[t]}
          </button>
        ))}
      </div>

      {tipo === "fonograma" ? (
        <TrackPicker selected={tracks[0] ?? null} onSelect={(t) => onSelectTrack(0, t)} />
      ) : (
        <>
          {tracks.map((t, i) => (
            <div key={i} className="tgp-track-row">
              <div className="tgp-track-row-main">
                <TrackPicker selected={t} onSelect={(v) => onSelectTrack(i, v)} placeholder={`Canción ${i + 1} del ${TIPO_LABELS[tipo].toLowerCase()}...`} />
                {renderExtra?.(i)}
              </div>
              {tracks.length > 1 && (
                <button type="button" className="tgp-track-remove" onClick={() => onRemoveTrack(i)} aria-label="Quitar canción">
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" className="tgp-add-track" onClick={onAddTrack}>
            + Agregar otra canción del {TIPO_LABELS[tipo].toLowerCase()}
          </button>
        </>
      )}
    </div>
  );
}
