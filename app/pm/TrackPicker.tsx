"use client";

import { useEffect, useState } from "react";
import type { SplitTrackOption } from "@discografica/shared/types/editorialSplits";

// Compartido entre Split editorial y Release — buscar una canción ya
// cargada en el catálogo (o tipearla a mano si todavía no existe) es
// exactamente el mismo problema en los dos flujos, así que viven en un
// solo componente en vez de duplicar la lógica de búsqueda/dropdown.
export const TRACK_PICKER_STYLES = `
  .tpk-input { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; color:var(--text-1); font-size:13.5px; }
  .tpk-track-chip { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:10px 14px; }
  .tpk-track-chip strong { font-size:14px; }
  .tpk-track-chip span { font-size:12px; color:var(--text-3); }
  .tpk-dropdown { position:relative; }
  .tpk-dropdown-list { position:absolute; z-index:20; top:calc(100% + 4px); left:0; right:0; background:var(--bg-2); border:1px solid var(--glass-border); border-radius:10px; box-shadow:var(--shadow-glass-lg); max-height:240px; overflow-y:auto; }
  .tpk-dropdown-item { padding:9px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--line-soft); color:var(--text-1); }
  .tpk-dropdown-item:last-child { border-bottom:none; }
  .tpk-dropdown-item:hover, .tpk-dropdown-item.active { background:var(--accent-glass-bg); }
  .tpk-dropdown-item .meta { font-size:11.5px; color:var(--text-3); margin-top:2px; }
  .tpk-new-person-fields { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px; }
  .tpk-change-link { background:none; border:none; color:var(--text-3); font-size:11.5px; cursor:pointer; text-decoration:underline; flex-shrink:0; }
  .tpk-new-badge { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:2px 7px; border-radius:100px; background:var(--accent-glass-bg); color:var(--accent-color); flex-shrink:0; }
`;

export function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Cuando el PM todavía no cargó el fonograma, permite tipear canción/
// artista/sello a mano en vez de buscarlos en el catálogo — produce un
// SplitTrackOption con id:null.
export function ManualTrackEntry({ onConfirm, onCancel }: { onConfirm: (t: SplitTrackOption) => void; onCancel: () => void }) {
  const [track, setTrack] = useState("");
  const [artistDisplay, setArtistDisplay] = useState("");
  const [sello, setSello] = useState("");
  const ready = track.trim() && artistDisplay.trim();

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: 12 }}>
      <div className="tpk-new-person-fields" style={{ marginTop: 0, marginBottom: 8 }}>
        <input className="tpk-input" placeholder="Nombre del fonograma" value={track} onChange={(e) => setTrack(e.target.value)} />
        <input className="tpk-input" placeholder="Artista" value={artistDisplay} onChange={(e) => setArtistDisplay(e.target.value)} />
        <input className="tpk-input" placeholder="Sello (opcional)" value={sello} onChange={(e) => setSello(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="tpk-change-link"
          style={{ textDecoration: "none", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 14px" }}
          disabled={!ready}
          onClick={() => onConfirm({ id: null, track: track.trim(), artistDisplay: artistDisplay.trim(), sello: sello.trim() || null, audioUrl: null })}
        >
          Confirmar
        </button>
        <button type="button" className="tpk-change-link" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function TrackPicker({
  selected,
  onSelect,
  placeholder = "Buscá por canción o artista...",
}: {
  selected: SplitTrackOption | null;
  onSelect: (t: SplitTrackOption | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [results, setResults] = useState<SplitTrackOption[]>([]);
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    fetch(`/api/pm/split-editorial/tracks?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.tracks ?? []));
  }, [debounced]);

  if (selected) {
    return (
      <>
        <style>{TRACK_PICKER_STYLES}</style>
        <div className="tpk-track-chip">
          <div>
            <strong>{selected.track}</strong>
            {selected.id === null && <span className="tpk-new-badge" style={{ marginLeft: 8 }}>Sin fonograma todavía</span>}
            <br />
            <span>
              {selected.artistDisplay}
              {selected.sello ? ` · ${selected.sello}` : ""}
            </span>
          </div>
          <button type="button" className="tpk-change-link" onClick={() => onSelect(null)}>
            Cambiar
          </button>
        </div>
      </>
    );
  }

  if (manual) {
    return (
      <>
        <style>{TRACK_PICKER_STYLES}</style>
        <ManualTrackEntry onConfirm={onSelect} onCancel={() => setManual(false)} />
      </>
    );
  }

  return (
    <>
    <style>{TRACK_PICKER_STYLES}</style>
    <div className="tpk-dropdown">
      <input
        className="tpk-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="tpk-dropdown-list">
          {results.map((t) => (
            <div
              key={t.id}
              className="tpk-dropdown-item"
              onMouseDown={() => {
                onSelect(t);
                setQuery("");
                setOpen(false);
              }}
            >
              {t.track}
              <div className="meta">
                {t.artistDisplay}
                {t.sello ? ` · ${t.sello}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && debounced.trim() && results.length === 0 && (
        <div className="tpk-dropdown-list">
          <div className="tpk-dropdown-item">No encontramos ninguna canción con ese nombre.</div>
        </div>
      )}
      <button
        type="button"
        className="tpk-change-link"
        style={{ marginTop: 10, fontSize: 15, color: "#fff", fontWeight: 600 }}
        onClick={() => setManual(true)}
      >
        Todavía no tengo el fonograma cargado — cargar los datos a mano
      </button>
    </div>
    </>
  );
}
