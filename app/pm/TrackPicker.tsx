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
  .tpk-dropdown-create { color:var(--accent-color); font-weight:600; }
  .tpk-manual-fields { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:10px; padding:12px; }
  .tpk-manual-fields .tpk-dropdown { grid-column: span 1; }
  .tpk-manual-badge { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:2px 7px; border-radius:100px; background:var(--accent-glass-bg); color:var(--accent-color); }
  .tpk-manual-header { grid-column: 1 / -1; display:flex; align-items:center; justify-content:space-between; margin-bottom:2px; }
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

type ArtistMatch = { id: string; name: string; sello: string | null };

// Autocompletar contra el roster real (mismo endpoint que ya usa el plan de
// marketing/Tour Manager) en vez de un input libre — así "TH" no queda
// como texto suelto si el artista real ya está cargado como "mamiyosoyelth".
// Si no hay ningún match, ofrece registrar el artista nuevo (ensureArtistExists),
// mismo criterio que "+ Crear a ..." ya usa para autores/compositores.
function ArtistField({ value, onChange, placeholder = "Artista" }: { value: string; onChange: (name: string) => void; placeholder?: string }) {
  const [results, setResults] = useState<ArtistMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounced = useDebounced(value);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    fetch(`/api/artists/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []));
  }, [debounced]);

  async function createArtist(name: string) {
    setCreating(true);
    try {
      await fetch("/api/pm/split-editorial/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } finally {
      setCreating(false);
    }
  }

  const trimmed = value.trim();
  const exactMatch = results.some((a) => a.name.trim().toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="tpk-dropdown">
      <input
        className="tpk-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && trimmed.length >= 2 && (results.length > 0 || !exactMatch) && (
        <div className="tpk-dropdown-list">
          {results.map((a) => (
            <div
              key={a.id}
              className="tpk-dropdown-item"
              onMouseDown={() => {
                onChange(a.name);
                setOpen(false);
              }}
            >
              {a.name}
              {a.sello && <div className="meta">{a.sello}</div>}
            </div>
          ))}
          {!exactMatch && (
            <div
              className="tpk-dropdown-item tpk-dropdown-create"
              onMouseDown={() => {
                onChange(trimmed);
                createArtist(trimmed);
                setOpen(false);
              }}
            >
              {creating ? "Creando..." : `+ Crear artista nuevo: "${trimmed}"`}
            </div>
          )}
        </div>
      )}
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

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    fetch(`/api/pm/split-editorial/tracks?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.tracks ?? []));
  }, [debounced]);

  // Fonograma real del catálogo (id != null) — chip fijo, ya no se edita
  // acá, exactamente igual que cuando llega precargado desde el board.
  if (selected && selected.id !== null) {
    return (
      <>
        <style>{TRACK_PICKER_STYLES}</style>
        <div className="tpk-track-chip">
          <div>
            <strong>{selected.track}</strong>
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

  // Carga a mano (sin fonograma en el catálogo todavía): los 3 campos
  // quedan siempre visibles y editables desde el primer momento — sin un
  // paso de "Confirmar" aparte — es el mismo mecanismo que ya se usa
  // cuando el Release/Split viene precargado, solo que acá se completa
  // desde cero en vez de ya venir con los datos puestos.
  if (selected && selected.id === null) {
    return (
      <>
        <style>{TRACK_PICKER_STYLES}</style>
        <div className="tpk-manual-fields">
          <div className="tpk-manual-header">
            <span className="tpk-manual-badge">Sin fonograma todavía</span>
            <button type="button" className="tpk-change-link" onClick={() => onSelect(null)}>
              Buscar en el catálogo en cambio
            </button>
          </div>
          <input
            className="tpk-input"
            placeholder="Nombre del fonograma"
            value={selected.track}
            onChange={(e) => onSelect({ ...selected, track: e.target.value })}
          />
          <ArtistField value={selected.artistDisplay} onChange={(name) => onSelect({ ...selected, artistDisplay: name })} />
          <input
            className="tpk-input"
            placeholder="Sello (opcional)"
            value={selected.sello ?? ""}
            onChange={(e) => onSelect({ ...selected, sello: e.target.value || null })}
          />
        </div>
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
        onClick={() => onSelect({ id: null, track: "", artistDisplay: "", sello: null, audioUrl: null })}
      >
        Todavía no tengo el fonograma cargado — cargar los datos a mano
      </button>
    </div>
    </>
  );
}
