"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../_shared";
import { upload } from "@vercel/blob/client";
import type { SplitPersonInput, SplitPersonOption, SplitTrackOption } from "@discografica/shared/types/editorialSplits";

const SPX_STYLES = `
  .spx-field-label { font-size:12.5px; color:var(--text-2); margin-bottom:6px; display:block; font-weight:600; }
  .spx-input { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; color:var(--text-1); font-size:13.5px; }
  .spx-track-chip { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:10px 14px; }
  .spx-track-chip strong { font-size:14px; }
  .spx-track-chip span { font-size:12px; color:var(--text-3); }
  .spx-dropdown { position:relative; }
  .spx-dropdown-list { position:absolute; z-index:20; top:calc(100% + 4px); left:0; right:0; background:var(--glass-bg-strong); border:1px solid var(--glass-border); border-radius:10px; box-shadow:var(--shadow-glass-lg); max-height:240px; overflow-y:auto; backdrop-filter:blur(30px) saturate(1.7); -webkit-backdrop-filter:blur(30px) saturate(1.7); }
  .spx-dropdown-item { padding:9px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--line-soft); }
  .spx-dropdown-item:last-child { border-bottom:none; }
  .spx-dropdown-item:hover, .spx-dropdown-item.active { background:var(--accent-glass-bg); }
  .spx-dropdown-item .meta { font-size:11.5px; color:var(--text-3); margin-top:2px; }
  .spx-dropdown-create { color:var(--accent-color); font-weight:600; }

  .spx-section { margin-top:1.5rem; }
  .spx-section-title { font-size:15px; font-weight:700; letter-spacing:.02em; margin-bottom:10px; }
  .spx-row { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
  .spx-row-main { flex:1; min-width:0; }
  .spx-percent-input { width:88px; text-align:right; }
  .spx-remove { background:transparent; border:none; color:var(--text-3); cursor:pointer; font-size:18px; line-height:1; padding:8px 4px; }
  .spx-remove:hover { color:var(--crit-ink); }
  .spx-add-person { background:transparent; border:1px dashed var(--line-soft); border-radius:8px; padding:9px 14px; color:var(--text-2); cursor:pointer; font-size:13px; width:100%; text-align:left; }
  .spx-add-person:hover { border-color:var(--accent-color); color:var(--text-1); }

  .spx-total { margin-top:10px; font-size:13.5px; font-weight:600; display:flex; align-items:center; gap:8px; }
  .spx-total.ok { color:var(--good-ink); }
  .spx-total.short, .spx-total.over { color:var(--warn-ink); }

  .spx-new-person-fields { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px; }
  .spx-new-person-fields input { grid-column: span 1; }
  .spx-new-person-fields input[type="date"] { color:var(--text-1); }

  .spx-calc-row { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
  .spx-calc-row input { width:70px; }
  .spx-calc-btn { background:transparent; border:1px solid var(--line-soft); border-radius:8px; padding:8px 14px; color:var(--text-2); cursor:pointer; font-size:12.5px; }
  .spx-calc-btn:hover { border-color:var(--accent-color); color:var(--text-1); }

  .spx-resolved-chip { display:flex; align-items:center; gap:8px; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; }
  .spx-resolved-name { font-size:13.5px; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .spx-new-badge { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:2px 7px; border-radius:100px; background:var(--accent-glass-bg); color:var(--accent-color); flex-shrink:0; }
  .spx-change-link { background:none; border:none; color:var(--text-3); font-size:11.5px; cursor:pointer; text-decoration:underline; flex-shrink:0; }

  .spx-matched-ficha { margin-top:6px; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; }
  .spx-matched-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:var(--text-3); display:block; margin-bottom:6px; }
  .spx-matched-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; font-size:12.5px; color:var(--text-2); }

  .spx-attachments { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .spx-attachment-hint { font-size:11.5px; color:var(--text-3); margin-top:4px; }
  .spx-attachment-hint.ok { color:var(--good-ink); }

  .spx-submit-bar { margin-top:2rem; display:flex; align-items:center; justify-content:flex-end; gap:14px; flex-wrap:wrap; }
  .spx-submit-hint { font-size:12.5px; color:var(--text-3); }
  .spx-submit-btn { background:var(--accent-gradient); border:none; border-radius:8px; padding:12px 24px; color:var(--accent-ink); font-weight:700; cursor:pointer; font-size:14px; }
  .spx-submit-btn:disabled { opacity:.4; cursor:default; }
  .spx-error { background:var(--crit-bg); color:var(--crit-ink); padding:10px 16px; border-radius:10px; font-size:13px; margin-top:14px; }
  .spx-success { background:var(--good-bg); color:var(--good-ink); padding:16px; border-radius:10px; font-size:14px; margin-top:14px; text-align:center; }
`;

// Percent scaled by 100, rounded to an integer (16.8% -> 1680) — matches
// the server so "does this add up to 50%" is an exact integer comparison,
// never a floating-point one.
function parsePercent(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatX100(x100: number): string {
  let s = (x100 / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}

type Row = {
  key: string;
  personId: string | null;
  personName: string;
  isNew: boolean;
  newEmail: string;
  newApellido: string;
  newNombreCompleto: string;
  newDni: string;
  newDireccion: string;
  newFechaNacimiento: string;
  newSadaic: string;
  newIpi: string;
  // Ficha completa de una persona YA existente en Publishing, autocompletada
  // apenas el PM la elige del buscador — solo para mostrarla, nunca se
  // reenvía al servidor (que sigue mandando solo el personId).
  matched: SplitPersonOption | null;
  percentRaw: string;
};

function newRow(): Row {
  return {
    key: Math.random().toString(36).slice(2),
    personId: null,
    personName: "",
    isNew: false,
    newEmail: "",
    newApellido: "",
    newNombreCompleto: "",
    newDni: "",
    newDireccion: "",
    newFechaNacimiento: "",
    newSadaic: "",
    newIpi: "",
    matched: null,
    percentRaw: "",
  };
}

// Reparte 5000 (50,00%) entre n personas lo más parejo posible — el resto de
// la división entera va a las primeras filas para que la suma siempre cierre
// en exactamente 5000, nunca 4999/5001 por redondeo.
function splitEvenly(n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(5000 / n);
  const remainder = 5000 % n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function TrackPicker({ selected, onSelect }: { selected: SplitTrackOption | null; onSelect: (t: SplitTrackOption | null) => void }) {
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

  if (selected) {
    return (
      <div className="spx-track-chip">
        <div>
          <strong>{selected.track}</strong>
          <br />
          <span>
            {selected.artistDisplay}
            {selected.sello ? ` · ${selected.sello}` : ""}
          </span>
        </div>
        <button type="button" className="spx-change-link" onClick={() => onSelect(null)}>
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="spx-dropdown">
      <input
        className="spx-input"
        placeholder="Buscá por canción o artista..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="spx-dropdown-list">
          {results.map((t) => (
            <div
              key={t.id}
              className="spx-dropdown-item"
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
        <div className="spx-dropdown-list">
          <div className="spx-dropdown-item">No encontramos ninguna canción con ese nombre.</div>
        </div>
      )}
    </div>
  );
}

function PersonSlot({ row, onChange, onRemove }: { row: Row; onChange: (patch: Partial<Row>) => void; onRemove: () => void }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [results, setResults] = useState<SplitPersonOption[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    fetch(`/api/pm/split-editorial/people?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.people ?? []));
  }, [debounced]);

  const resolved = row.personName.trim().length > 0;

  return (
    <div className="spx-row">
      <div className="spx-row-main">
        {!resolved ? (
          <div className="spx-dropdown">
            <input
              className="spx-input"
              placeholder="Nombre del autor/compositor..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && query.trim() && (
              <div className="spx-dropdown-list">
                {results.map((p) => (
                  <div
                    key={p.id}
                    className="spx-dropdown-item"
                    onMouseDown={() => {
                      onChange({ personId: p.id, personName: p.nombreArtistico, isNew: false, matched: p });
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {p.nombreArtistico}
                  </div>
                ))}
                <div
                  className="spx-dropdown-item spx-dropdown-create"
                  onMouseDown={() => {
                    onChange({ personId: null, personName: query.trim(), isNew: true, matched: null });
                    setCreating(true);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  + Crear a &quot;{query.trim()}&quot;
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="spx-resolved-chip">
              <span className="spx-resolved-name">{row.personName}</span>
              {row.isNew && <span className="spx-new-badge">Nuevo</span>}
              <button
                type="button"
                className="spx-change-link"
                onClick={() => {
                  onChange({ personId: null, personName: "", isNew: false, newEmail: "", matched: null });
                  setCreating(false);
                }}
              >
                Cambiar
              </button>
            </div>
            {row.isNew && creating && (
              <div className="spx-new-person-fields">
                <input
                  className="spx-input"
                  placeholder="Nombre completo (opcional)"
                  value={row.newNombreCompleto}
                  onChange={(e) => onChange({ newNombreCompleto: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Apellido (opcional)"
                  value={row.newApellido}
                  onChange={(e) => onChange({ newApellido: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="DNI (opcional)"
                  value={row.newDni}
                  onChange={(e) => onChange({ newDni: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Fecha de nacimiento (opcional)"
                  type="date"
                  value={row.newFechaNacimiento}
                  onChange={(e) => onChange({ newFechaNacimiento: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Número de SADAIC (opcional)"
                  value={row.newSadaic}
                  onChange={(e) => onChange({ newSadaic: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Número de IPI (opcional)"
                  value={row.newIpi}
                  onChange={(e) => onChange({ newIpi: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Domicilio (opcional)"
                  value={row.newDireccion}
                  onChange={(e) => onChange({ newDireccion: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Email (opcional)"
                  value={row.newEmail}
                  onChange={(e) => onChange({ newEmail: e.target.value })}
                />
              </div>
            )}
            {!row.isNew && row.matched && (
              <div className="spx-matched-ficha">
                <span className="spx-matched-title">Ficha en Publishing (autocompletada)</span>
                <div className="spx-matched-grid">
                  <span>Nombre completo: {row.matched.nombreCompleto || "—"}</span>
                  <span>Apellido: {row.matched.apellido || "—"}</span>
                  <span>DNI: {row.matched.dni || "—"}</span>
                  <span>Fecha de nacimiento: {row.matched.fechaNacimiento || "—"}</span>
                  <span>SADAIC: {row.matched.sadaic || "—"}</span>
                  <span>IPI: {row.matched.ipi || "—"}</span>
                  <span>Domicilio: {row.matched.direccion || "—"}</span>
                  <span>Email: {row.matched.email || "—"}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <input
        className="spx-input spx-percent-input"
        placeholder="0%"
        inputMode="decimal"
        value={row.percentRaw}
        onChange={(e) => onChange({ percentRaw: e.target.value })}
      />
      <button type="button" className="spx-remove" onClick={onRemove} aria-label="Quitar">
        ×
      </button>
    </div>
  );
}

function SplitSection({ title, rows, setRows }: { title: string; rows: Row[]; setRows: (rows: Row[]) => void }) {
  const [partes, setPartes] = useState("");
  const sum = rows.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const status = sum === 5000 ? "ok" : sum < 5000 ? "short" : "over";
  const statusText =
    sum === 5000
      ? `${formatX100(sum)}% / 50% ✓`
      : sum < 5000
        ? `${formatX100(sum)}% / 50% — Falta ${formatX100(5000 - sum)}%`
        : `${formatX100(sum)}% / 50% — Te pasaste ${formatX100(sum - 5000)}%`;

  function updateRow(key: string, patch: Partial<Row>) {
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setRows(rows.filter((r) => r.key !== key));
  }

  function applyCalc() {
    const n = Math.trunc(Number(partes));
    if (!Number.isFinite(n) || n <= 0) return;
    const shares = splitEvenly(n);
    const nextRows = Array.from({ length: n }, (_, i) => rows[i] ?? newRow());
    setRows(nextRows.map((r, i) => ({ ...r, percentRaw: formatX100(shares[i]) })));
  }

  return (
    <div className="spx-section">
      <div className="spx-section-title">{title}</div>
      <div className="spx-calc-row">
        <input
          className="spx-input"
          placeholder="¿Entre cuántas partes se divide?"
          inputMode="numeric"
          value={partes}
          onChange={(e) => setPartes(e.target.value)}
        />
        <button type="button" className="spx-calc-btn" onClick={applyCalc}>
          Repartir 50% en partes iguales
        </button>
      </div>
      {rows.map((r) => (
        <PersonSlot key={r.key} row={r} onChange={(patch) => updateRow(r.key, patch)} onRemove={() => removeRow(r.key)} />
      ))}
      <button type="button" className="spx-add-person" onClick={() => setRows([...rows, newRow()])}>
        + Agregar autor/compositor
      </button>
      <div className={`spx-total ${status}`}>{statusText}</div>
    </div>
  );
}

function SplitEditorialForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = useMemo<SplitTrackOption | null>(() => {
    const catalogTrackId = searchParams.get("catalogTrackId");
    const trackName = searchParams.get("trackName");
    const artistDisplay = searchParams.get("artistDisplay");
    if (!catalogTrackId || !trackName || !artistDisplay) return null;
    return {
      id: catalogTrackId,
      track: trackName,
      artistDisplay,
      sello: searchParams.get("sello"),
      audioUrl: searchParams.get("audioUrl"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [track, setTrack] = useState<SplitTrackOption | null>(prefill);
  const [letra, setLetra] = useState<Row[]>([newRow()]);
  const [musica, setMusica] = useState<Row[]>([newRow()]);
  const [letraDoc, setLetraDoc] = useState<{ url: string; nombre: string } | null>(null);
  const [uploadingLetra, setUploadingLetra] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleLetraFile(file: File) {
    setUploadingLetra(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/pm/upload",
        clientPayload: "letra",
      });
      setLetraDoc({ url: blob.url, nombre: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el documento de letra.");
    } finally {
      setUploadingLetra(false);
    }
  }

  const letraSum = letra.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const musicaSum = musica.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const rowsReady = (rows: Row[]) => rows.length > 0 && rows.every((r) => r.personName.trim() && (parsePercent(r.percentRaw) ?? 0) > 0);
  const canSubmit = !!track && letraSum === 5000 && musicaSum === 5000 && rowsReady(letra) && rowsReady(musica);

  function toInput(rows: Row[]): SplitPersonInput[] {
    return rows.map((r) =>
      r.isNew
        ? {
            newPerson: {
              nombreArtistico: r.personName,
              nombreCompleto: r.newNombreCompleto.trim() || null,
              email: r.newEmail.trim() || null,
              apellido: r.newApellido.trim() || null,
              dni: r.newDni.trim() || null,
              direccion: r.newDireccion.trim() || null,
              fechaNacimiento: r.newFechaNacimiento.trim() || null,
              sadaic: r.newSadaic.trim() || null,
              ipi: r.newIpi.trim() || null,
            },
            percentX100: parsePercent(r.percentRaw) ?? 0,
          }
        : { personId: r.personId!, percentX100: parsePercent(r.percentRaw) ?? 0 }
    );
  }

  async function handleSubmit() {
    if (!canSubmit || !track) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pm/split-editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogTrackId: track.id,
          letra: toInput(letra),
          musica: toInput(musica),
          letraUrl: letraDoc?.url ?? null,
          letraNombre: letraDoc?.nombre ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el split.");
      setDone(true);
      resetTimer.current = setTimeout(() => router.push("/pm"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  if (done) {
    return (
      <div className="pmx-card">
        <div className="spx-success">✓ Listo. El split ya está en Publishing.</div>
      </div>
    );
  }

  return (
    <div className="pmx-card">
      <style>{SPX_STYLES}</style>
      <label className="spx-field-label">Elegí la canción</label>
      <TrackPicker selected={track} onSelect={setTrack} />

      {track && (
        <>
          <div className="spx-section">
            <div className="spx-section-title">ARCHIVOS</div>
            <div className="spx-attachments">
              <div>
                <label className="spx-field-label">Documento de letra (opcional)</label>
                <input
                  className="spx-input"
                  type="file"
                  accept="application/pdf,.doc,.docx,text/plain"
                  disabled={uploadingLetra}
                  onChange={(e) => e.target.files?.[0] && handleLetraFile(e.target.files[0])}
                />
                {uploadingLetra && <div className="spx-attachment-hint">Subiendo...</div>}
                {letraDoc && !uploadingLetra && <div className="spx-attachment-hint ok">✓ {letraDoc.nombre}</div>}
              </div>
              <div>
                <label className="spx-field-label">Audio</label>
                {track.audioUrl ? (
                  <div className="spx-attachment-hint ok">✓ Ya cargado con el fonograma — no hace falta subirlo de nuevo.</div>
                ) : (
                  <div className="spx-attachment-hint">Se toma automáticamente del fonograma cuando corresponde.</div>
                )}
              </div>
            </div>
          </div>
          <SplitSection title="LETRA" rows={letra} setRows={setLetra} />
          <SplitSection title="MÚSICA" rows={musica} setRows={setMusica} />
        </>
      )}

      {error && <div className="spx-error">{error}</div>}

      <div className="spx-submit-bar">
        {!canSubmit && track && <span className="spx-submit-hint">Completá letra y música al 50% para enviar.</span>}
        <button type="button" className="spx-submit-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? "Enviando..." : "Enviar split"}
        </button>
      </div>
    </div>
  );
}

export default function SplitEditorialPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="Split editorial" subtitle="Cargá qué autores/compositores cobran letra y música de una canción." backHref="/pm">
        <SplitEditorialForm />
      </PMShell>
    </RequireRole>
  );
}
