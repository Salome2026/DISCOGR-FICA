"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../_shared";
import { upload } from "@vercel/blob/client";
import type { SplitPersonInput, SplitPersonOption, SplitTrackOption } from "@discografica/shared/types/editorialSplits";
import { TrackPicker, useDebounced } from "../TrackPicker";
import { TrackGroupPicker, type CargaTipo } from "../TrackGroupPicker";

const SPX_STYLES = `
  .spx-field-label { font-size:12.5px; color:var(--text-2); margin-bottom:6px; display:block; font-weight:600; }
  .spx-input { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; color:var(--text-1); font-size:13.5px; }
  .spx-dropdown { position:relative; }
  .spx-dropdown-list { position:absolute; z-index:20; top:calc(100% + 4px); left:0; right:0; background:var(--bg-2); border:1px solid var(--glass-border); border-radius:10px; box-shadow:var(--shadow-glass-lg); max-height:240px; overflow-y:auto; }
  .spx-dropdown-item { padding:9px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--line-soft); color:var(--text-1); }
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

type LetraEntry = { url: string | null; nombre: string | null; texto: string };
function emptyLetraEntry(): LetraEntry {
  return { url: null, nombre: null, texto: "" };
}

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
                  placeholder="Nombre completo"
                  value={row.newNombreCompleto}
                  onChange={(e) => onChange({ newNombreCompleto: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Apellido"
                  value={row.newApellido}
                  onChange={(e) => onChange({ newApellido: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="DNI"
                  value={row.newDni}
                  onChange={(e) => onChange({ newDni: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Fecha de nacimiento"
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
                  placeholder="Domicilio"
                  value={row.newDireccion}
                  onChange={(e) => onChange({ newDireccion: e.target.value })}
                />
                <input
                  className="spx-input"
                  placeholder="Email"
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
  // Con prefill (llegó desde una tarjeta del board de /pm/fonograma) queda
  // fijo en un solo fonograma, igual que siempre — el selector de EP/Álbum
  // es solo para cuando el PM arranca el flujo suelto, sin un fonograma
  // puntual en mente todavía.
  const [tipo, setTipo] = useState<CargaTipo>("fonograma");
  const [tracks, setTracks] = useState<(SplitTrackOption | null)[]>([prefill]);
  const [letra, setLetra] = useState<Row[]>([newRow()]);
  const [musica, setMusica] = useState<Row[]>([newRow()]);
  // Letra singular: usada en modo Fonograma (un solo track, con o sin
  // prefill). En EP/Álbum cada canción tiene su propia letra — distinto
  // texto/documento por canción, ver letraEntries — mientras que autores y
  // % (letra/musica de arriba) sí se comparten entre todas.
  const [letraDoc, setLetraDoc] = useState<{ url: string; nombre: string } | null>(null);
  const [letraTexto, setLetraTexto] = useState("");
  const [uploadingLetra, setUploadingLetra] = useState(false);
  const [letraEntries, setLetraEntries] = useState<LetraEntry[]>([emptyLetraEntry()]);
  const [uploadingLetraAt, setUploadingLetraAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function selectTrackAt(i: number, t: SplitTrackOption | null) {
    setTracks((prev) => prev.map((p, idx) => (idx === i ? t : p)));
  }
  function addTrackRow() {
    setTracks((prev) => [...prev, null]);
    setLetraEntries((prev) => [...prev, emptyLetraEntry()]);
  }
  function removeTrackRow(i: number) {
    setTracks((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [null]));
    setLetraEntries((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [emptyLetraEntry()]));
  }
  function changeTipo(next: CargaTipo) {
    setTipo(next);
    // Fonograma siempre tiene exactamente una fila — al volver de EP/Álbum
    // se conserva solo la primera canción ya elegida, igual que antes.
    if (next === "fonograma") setTracks((prev) => [prev[0] ?? null]);
  }
  function updateLetraEntry(i: number, patch: Partial<LetraEntry>) {
    setLetraEntries((prev) => {
      const next = [...prev];
      while (next.length <= i) next.push(emptyLetraEntry());
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }
  function letraForIndex(i: number): LetraEntry {
    return tipo === "fonograma" ? { url: letraDoc?.url ?? null, nombre: letraDoc?.nombre ?? null, texto: letraTexto } : letraEntries[i] ?? emptyLetraEntry();
  }

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

  async function handleLetraFileAt(i: number, file: File) {
    setUploadingLetraAt(i);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/pm/upload",
        clientPayload: "letra",
      });
      updateLetraEntry(i, { url: blob.url, nombre: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el documento de letra.");
    } finally {
      setUploadingLetraAt(null);
    }
  }

  function renderLetraExtra(i: number) {
    const entry = letraEntries[i] ?? emptyLetraEntry();
    return (
      <div style={{ marginTop: 8 }}>
        <label className="spx-field-label" style={{ marginBottom: 4 }}>
          Letra de esta canción — documento o texto (obligatorio)
        </label>
        <input
          className="spx-input"
          type="file"
          accept="application/pdf,.doc,.docx,text/plain"
          disabled={uploadingLetraAt === i}
          onChange={(e) => e.target.files?.[0] && handleLetraFileAt(i, e.target.files[0])}
        />
        {uploadingLetraAt === i && <div className="spx-attachment-hint">Subiendo...</div>}
        {entry.url && uploadingLetraAt !== i && <div className="spx-attachment-hint ok">✓ {entry.nombre}</div>}
        <textarea
          className="spx-input"
          placeholder="...o pegá el texto de la letra acá"
          rows={3}
          style={{ marginTop: 6, resize: "vertical", fontFamily: "inherit" }}
          value={entry.texto}
          onChange={(e) => updateLetraEntry(i, { texto: e.target.value })}
        />
        {tracks[i]?.audioUrl && (
          <div className="spx-attachment-hint ok" style={{ marginTop: 4 }}>
            ✓ Audio ya cargado con el fonograma.
          </div>
        )}
      </div>
    );
  }

  const letraSum = letra.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const musicaSum = musica.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const rowsReady = (rows: Row[]) =>
    rows.length > 0 &&
    rows.every((r) => {
      if (!r.personName.trim() || (parsePercent(r.percentRaw) ?? 0) <= 0) return false;
      if (r.isNew) {
        // SADAIC e IPI son los únicos campos opcionales de una persona
        // nueva — todo lo demás (identidad + contacto) es obligatorio.
        return !!(
          r.newNombreCompleto.trim() &&
          r.newApellido.trim() &&
          r.newDni.trim() &&
          r.newDireccion.trim() &&
          r.newFechaNacimiento.trim() &&
          r.newEmail.trim()
        );
      }
      return true;
    });
  const hasLetraContent =
    tipo === "fonograma"
      ? !!letraDoc || letraTexto.trim().length > 0
      : tracks.length > 0 && tracks.every((_, i) => !!letraEntries[i]?.url || !!letraEntries[i]?.texto.trim());
  const selectedTracks = tracks.filter((t): t is SplitTrackOption => t !== null);
  const anyTrack = selectedTracks.length > 0;
  const canSubmit =
    tracks.length > 0 &&
    tracks.every((t) => t !== null) &&
    letraSum === 5000 &&
    musicaSum === 5000 &&
    rowsReady(letra) &&
    rowsReady(musica) &&
    hasLetraContent;

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
    if (!canSubmit || selectedTracks.length === 0) return;
    setSubmitting(true);
    setError(null);
    let sentCount = 0;
    try {
      // Un POST por canción, en secuencia (nunca Promise.all) — cada una es
      // un split independiente en editorial_splits, y así una falla puntual
      // (ej. esa canción ya tiene un split enviado) no deja indeterminado
      // el estado de las demás.
      for (const [i, t] of selectedTracks.entries()) {
        const l = letraForIndex(i);
        const res = await fetch("/api/pm/split-editorial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogTrackId: t.id,
            trackName: t.track,
            artistDisplay: t.artistDisplay,
            sello: t.sello,
            letra: toInput(letra),
            musica: toInput(musica),
            letraUrl: l.url,
            letraNombre: l.nombre,
            letraTexto: l.texto.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`"${t.track}": ${data.error || "no se pudo enviar."}`);
        sentCount++;
      }
      setDone(true);
      resetTimer.current = setTimeout(() => router.push("/pm"), 1800);
    } catch (err) {
      // Lo que ya se envió no hay que reenviarlo — se saca de la lista (y su
      // letra correspondiente) para que el reintento solo cubra las
      // canciones que efectivamente fallaron.
      const stillPending = selectedTracks.slice(sentCount);
      setTracks(stillPending.length > 0 ? stillPending : [null]);
      setLetraEntries((prev) => {
        const rest = prev.slice(sentCount);
        return rest.length > 0 ? rest : [emptyLetraEntry()];
      });
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      setError(sentCount > 0 ? `Se enviaron ${sentCount} de ${selectedTracks.length}. ${msg}` : msg);
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
        <div className="spx-success">
          {selectedTracks.length > 1 ? `✓ Listo. Los ${selectedTracks.length} splits ya están en Publishing.` : "✓ Listo. El split ya está en Publishing."}
        </div>
      </div>
    );
  }

  const allHaveAudio = anyTrack && selectedTracks.every((t) => !!t.audioUrl);

  return (
    <div className="pmx-card">
      <style>{SPX_STYLES}</style>
      {prefill ? (
        <>
          <label className="spx-field-label">Elegí la canción</label>
          <TrackPicker selected={tracks[0] ?? null} onSelect={(t) => setTracks([t])} />
        </>
      ) : (
        <>
          <label className="spx-field-label">¿Qué estás cargando?</label>
          <TrackGroupPicker
            tipo={tipo}
            onTipoChange={changeTipo}
            tracks={tracks}
            onSelectTrack={selectTrackAt}
            onAddTrack={addTrackRow}
            onRemoveTrack={removeTrackRow}
            renderExtra={tipo !== "fonograma" ? renderLetraExtra : undefined}
          />
        </>
      )}

      {anyTrack && (
        <>
          {tipo === "fonograma" ? (
            <div className="spx-section">
              <div className="spx-section-title">ARCHIVOS</div>
              <div className="spx-attachments">
                <div>
                  <label className="spx-field-label">Letra — subí un documento o pegá el texto (obligatorio)</label>
                  <input
                    className="spx-input"
                    type="file"
                    accept="application/pdf,.doc,.docx,text/plain"
                    disabled={uploadingLetra}
                    onChange={(e) => e.target.files?.[0] && handleLetraFile(e.target.files[0])}
                  />
                  {uploadingLetra && <div className="spx-attachment-hint">Subiendo...</div>}
                  {letraDoc && !uploadingLetra && <div className="spx-attachment-hint ok">✓ {letraDoc.nombre}</div>}
                  <textarea
                    className="spx-input"
                    placeholder="...o pegá el texto de la letra acá"
                    rows={5}
                    style={{ marginTop: 8, resize: "vertical", fontFamily: "inherit" }}
                    value={letraTexto}
                    onChange={(e) => setLetraTexto(e.target.value)}
                  />
                </div>
                <div>
                  <label className="spx-field-label">Audio</label>
                  {allHaveAudio ? (
                    <div className="spx-attachment-hint ok">✓ Ya cargado con el fonograma — no hace falta subirlo de nuevo.</div>
                  ) : (
                    <div className="spx-attachment-hint">Se toma automáticamente del fonograma cuando corresponde.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="spx-attachment-hint" style={{ marginTop: 4, marginBottom: 4 }}>
              La letra de cada canción se carga arriba, junto a cada una. Los autores/compositores y el % de abajo se aplican a las {tracks.length} canciones elegidas.
            </p>
          )}
          <SplitSection title="LETRA" rows={letra} setRows={setLetra} />
          <SplitSection title="MÚSICA" rows={musica} setRows={setMusica} />
        </>
      )}

      {error && <div className="spx-error">{error}</div>}

      <div className="spx-submit-bar">
        {!canSubmit && anyTrack && <span className="spx-submit-hint">Completá letra y música al 50%, con los datos obligatorios de cada persona nueva, para enviar.</span>}
        <button type="button" className="spx-submit-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? "Enviando..." : tracks.length > 1 ? `Enviar ${tracks.length} splits` : "Enviar split"}
        </button>
      </div>
    </div>
  );
}

export default function SplitEditorialPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="Split editorial" subtitle="Cargá la división de % de autoría y composición de la obra." backHref="/pm">
        <SplitEditorialForm />
      </PMShell>
    </RequireRole>
  );
}
