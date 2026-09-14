"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RELEASE_TIPOS, type ReleaseTipo } from "@discografica/shared/types/legalReleaseRequests";
import type { SplitTrackOption } from "@discografica/shared/types/editorialSplits";
import { TrackGroupPicker, type CargaTipo } from "../TrackGroupPicker";

type PublishingMatch = {
  id: string;
  nombreArtistico: string;
  nombreCompleto: string | null;
  apellido: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  email: string | null;
};

function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const RLX_STYLES = `
  .rlx-field-label { font-size:12.5px; color:var(--text-2); margin-bottom:6px; display:block; font-weight:600; }
  .rlx-input { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; color:var(--text-1); font-size:13.5px; }
  .rlx-textarea { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; color:var(--text-1); font-size:13.5px; font-family:inherit; resize:vertical; min-height:70px; }
  .rlx-row { display:flex; gap:10px; margin-bottom:12px; }
  .rlx-row > div { flex:1; }

  .rlx-tipo-tabs { display:flex; gap:6px; }
  .rlx-tipo-tab { flex:1; background:var(--bg-1); border:1px solid var(--line-soft); border-radius:8px; padding:10px; color:var(--text-2); cursor:pointer; font-size:13px; font-weight:600; text-align:center; }
  .rlx-tipo-tab:hover { border-color:var(--accent-color); }
  .rlx-tipo-tab.active { background:var(--accent-glass-bg); border-color:var(--accent-color); color:var(--text-1); }

  .rlx-section { margin-top:1.5rem; }
  .rlx-section-title { font-size:15px; font-weight:700; letter-spacing:.02em; margin-bottom:10px; }
  .rlx-participant { background:var(--bg-2); border:1px solid var(--line-soft); border-radius:10px; padding:12px; margin-bottom:10px; }
  .rlx-participant-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .rlx-name-field { position:relative; }
  .rlx-dropdown-list { position:absolute; z-index:20; top:calc(100% + 4px); left:0; right:0; background:var(--bg-1); border:1px solid var(--glass-border); border-radius:10px; box-shadow:var(--shadow-glass-lg); max-height:220px; overflow-y:auto; }
  .rlx-dropdown-item { padding:9px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--line-soft); color:var(--text-1); }
  .rlx-dropdown-item:last-child { border-bottom:none; }
  .rlx-dropdown-item:hover { background:var(--accent-glass-bg); }
  .rlx-dropdown-item .meta { font-size:11.5px; color:var(--text-3); margin-top:2px; }
  .rlx-autofilled-note { font-size:11px; color:var(--good-ink); margin-top:4px; }
  .rlx-participant-percent { display:flex; align-items:center; gap:8px; margin-top:8px; }
  .rlx-participant-percent input { width:90px; text-align:right; }
  .rlx-remove { background:transparent; border:none; color:var(--text-3); cursor:pointer; font-size:12px; text-decoration:underline; margin-top:8px; }
  .rlx-remove:hover { color:var(--crit-ink); }
  .rlx-add { background:transparent; border:1px dashed var(--line-soft); border-radius:8px; padding:9px 14px; color:var(--text-2); cursor:pointer; font-size:13px; width:100%; text-align:left; }
  .rlx-add:hover { border-color:var(--accent-color); color:var(--text-1); }

  .rlx-total { margin-top:10px; font-size:13.5px; font-weight:600; }
  .rlx-total.ok { color:var(--good-ink); }
  .rlx-total.off { color:var(--warn-ink); }

  .rlx-submit-bar { margin-top:2rem; display:flex; align-items:center; justify-content:flex-end; gap:14px; flex-wrap:wrap; }
  .rlx-submit-hint { font-size:12.5px; color:var(--text-3); }
  .rlx-submit-btn { background:var(--accent-gradient); border:none; border-radius:8px; padding:12px 24px; color:var(--accent-ink); font-weight:700; cursor:pointer; font-size:14px; }
  .rlx-submit-btn:disabled { opacity:.4; cursor:default; }
  .rlx-error { background:var(--crit-bg); color:var(--crit-ink); padding:10px 16px; border-radius:10px; font-size:13px; margin-top:14px; }
  .rlx-success { background:var(--good-bg); color:var(--good-ink); padding:16px; border-radius:10px; font-size:14px; margin-top:14px; text-align:center; }
`;

// Percent scaled by 100, entero — mismo criterio que Split editorial: la
// suma de participantes tiene que cerrar en exactamente 10000 (100,00%).
function parsePercent(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatX100(x100: number): string {
  const s = (x100 / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}

type ParticipantRow = {
  key: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  domicilio: string;
  email: string;
  percentRaw: string;
  autofilledFrom: string | null;
};

function newParticipant(): ParticipantRow {
  return {
    key: Math.random().toString(36).slice(2),
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    domicilio: "",
    email: "",
    percentRaw: "",
    autofilledFrom: null,
  };
}

// Reusa /api/pm/split-editorial/people (misma ficha de Publishing que ya
// usa Split editorial) para autocompletar apellido/DNI/fecha de
// nacimiento/domicilio/email cuando el nombre tipeado matchea a alguien
// ya cargado — evita errores de tipeo re-escribiendo datos que ya
// existen. Los campos quedan igual de editables después de autocompletar
// (acá no se crea ni edita la ficha de Publishing, solo se copian los
// valores a este formulario).
function ParticipantNameField({ value, onPick, onType }: { value: string; onPick: (m: PublishingMatch) => void; onType: (v: string) => void }) {
  const [results, setResults] = useState<PublishingMatch[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(value);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    fetch(`/api/pm/split-editorial/people?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.people ?? []));
  }, [debounced]);

  return (
    <div className="rlx-name-field">
      <input
        className="rlx-input"
        placeholder="Nombre"
        value={value}
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && value.trim() && results.length > 0 && (
        <div className="rlx-dropdown-list">
          {results.map((p) => (
            <div
              key={p.id}
              className="rlx-dropdown-item"
              onMouseDown={() => {
                onPick(p);
                setOpen(false);
              }}
            >
              {p.nombreArtistico}
              {p.nombreCompleto && <div className="meta">{p.nombreCompleto} {p.apellido || ""}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type FonogramaInfo = {
  id: number;
  fonograma_nombre: string;
  artist_name: string;
  sello: string | null;
  fecha_lanzamiento: string | null;
  group_nombre: string | null;
};

// pmReleaseId: null = cargando el Release antes de que exista el fonograma
// — todos los campos arrancan vacíos y editables, sin fetch previo.
export default function ReleaseForm({ pmReleaseId }: { pmReleaseId: number | null }) {
  const router = useRouter();
  const [fonograma, setFonograma] = useState<FonogramaInfo | null | undefined>(pmReleaseId == null ? null : undefined);
  const [trackName, setTrackName] = useState("");
  const [artistDisplay, setArtistDisplay] = useState("");
  const [sello, setSello] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState<ReleaseTipo | "">("");
  // Solo aplica cuando pmReleaseId es null (carga suelta, sin un fonograma
  // puntual todavía) — con un fonograma real ya se sabe que es uno solo.
  const [cargaTipo, setCargaTipo] = useState<CargaTipo>("fonograma");
  const [tracks, setTracks] = useState<(SplitTrackOption | null)[]>([null]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([newParticipant()]);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const selectedTracks = tracks.filter((t): t is SplitTrackOption => t !== null);
  const loose = pmReleaseId == null;

  useEffect(() => {
    if (pmReleaseId == null) return;
    fetch(`/api/pm/releases/${pmReleaseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error || !d.release) {
          setFonograma(null);
          return;
        }
        const r = d.release as FonogramaInfo;
        setFonograma(r);
        setTrackName(r.group_nombre || r.fonograma_nombre);
        setArtistDisplay(r.artist_name);
        setSello(r.sello || "");
        setFecha(r.fecha_lanzamiento ? r.fecha_lanzamiento.slice(0, 10) : "");
      })
      .catch(() => setFonograma(null));
  }, [pmReleaseId]);

  function updateParticipant(key: string, patch: Partial<ParticipantRow>) {
    setParticipants((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }
  function removeParticipant(key: string) {
    setParticipants((prev) => prev.filter((p) => p.key !== key));
  }

  const sum = participants.reduce((s, p) => s + (parsePercent(p.percentRaw) ?? 0), 0);
  const rowsReady = participants.length > 0 && participants.every((p) => p.nombre.trim() && (parsePercent(p.percentRaw) ?? 0) > 0);
  const fonogramaReady =
    pmReleaseId != null ? !!fonograma : tracks.length > 0 && tracks.every((t) => t !== null && t.track.trim() && t.artistDisplay.trim());
  const canSubmit = fonogramaReady && !!tipo && (loose || (trackName.trim() && artistDisplay.trim())) && sum === 10000 && rowsReady;

  function participantsPayload() {
    return participants.map((p) => ({
      nombre: p.nombre.trim(),
      apellido: p.apellido.trim() || null,
      dni: p.dni.trim() || null,
      fechaNacimiento: p.fechaNacimiento.trim() || null,
      domicilio: p.domicilio.trim() || null,
      email: p.email.trim() || null,
      percentX100: parsePercent(p.percentRaw) ?? 0,
    }));
  }

  async function postRelease(body: Record<string, unknown>) {
    const res = await fetch("/api/pm/release-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo guardar el Release.");
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    let sentCount = 0;
    try {
      if (loose) {
        // Un POST por canción, en secuencia — igual criterio que Split
        // editorial: cada Release es una fila independiente en
        // legal_release_requests, así que una falla puntual no deja
        // indeterminado el estado de las demás.
        for (const t of selectedTracks) {
          try {
            await postRelease({
              catalogTrackId: t.id,
              trackName: t.track,
              artistDisplay: t.artistDisplay,
              sello: t.sello,
              fechaLanzamiento: fecha || null,
              tipo,
              participants: participantsPayload(),
              comentario: comentario.trim() || null,
            });
          } catch (err) {
            throw new Error(`"${t.track}": ${err instanceof Error ? err.message : "no se pudo enviar."}`);
          }
          sentCount++;
        }
      } else {
        await postRelease({
          pmReleaseId,
          trackName: trackName.trim(),
          artistDisplay: artistDisplay.trim(),
          sello: sello || null,
          fechaLanzamiento: fecha || null,
          tipo,
          participants: participantsPayload(),
          comentario: comentario.trim() || null,
        });
      }
      setDone(true);
      setTimeout(() => router.push("/pm/fonograma"), 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      if (loose && sentCount > 0) {
        // Lo ya enviado no hay que reenviarlo — se saca de la lista para que
        // el reintento solo cubra las canciones que efectivamente fallaron.
        const stillPending = selectedTracks.slice(sentCount);
        setTracks(stillPending.length > 0 ? stillPending : [null]);
        setError(`Se enviaron ${sentCount} de ${selectedTracks.length}. ${msg}`);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (pmReleaseId != null && fonograma === undefined) {
    return (
      <div className="pmx-card">
        <p style={{ color: "var(--text-3)" }}>Cargando fonograma...</p>
      </div>
    );
  }
  if (pmReleaseId != null && fonograma === null) {
    return (
      <div className="pmx-card">
        <p style={{ color: "var(--text-3)" }}>No encontramos ese fonograma.</p>
      </div>
    );
  }
  if (done) {
    return (
      <div className="pmx-card">
        <style>{RLX_STYLES}</style>
        <div className="rlx-success">
          {loose && selectedTracks.length > 1
            ? `✓ Listo. Los ${selectedTracks.length} Releases ya están en Legales.`
            : "✓ Listo. El Release ya está en Legales."}
        </div>
      </div>
    );
  }

  return (
    <div className="pmx-card">
      <style>{RLX_STYLES}</style>

      {loose ? (
        <>
          <label className="rlx-field-label">¿Qué estás cargando?</label>
          <TrackGroupPicker
            tipo={cargaTipo}
            onTipoChange={(t) => {
              setCargaTipo(t);
              if (t === "fonograma") setTracks([tracks[0] ?? null]);
            }}
            tracks={tracks}
            onSelectTrack={(i, t) => setTracks((prev) => prev.map((p, idx) => (idx === i ? t : p)))}
            onAddTrack={() => setTracks((prev) => [...prev, null])}
            onRemoveTrack={(i) => setTracks((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [null]))}
          />
          <div className="rlx-row" style={{ marginTop: 12 }}>
            <div>
              <label className="rlx-field-label">Fecha de lanzamiento</label>
              <input className="rlx-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rlx-row">
            <div>
              <label className="rlx-field-label">Fonograma</label>
              <input className="rlx-input" value={trackName} onChange={(e) => setTrackName(e.target.value)} />
            </div>
            <div>
              <label className="rlx-field-label">Artista</label>
              <input className="rlx-input" value={artistDisplay} onChange={(e) => setArtistDisplay(e.target.value)} />
            </div>
          </div>
          <div className="rlx-row">
            <div>
              <label className="rlx-field-label">Sello</label>
              <input className="rlx-input" value={sello} onChange={(e) => setSello(e.target.value)} />
            </div>
            <div>
              <label className="rlx-field-label">Fecha de lanzamiento</label>
              <input className="rlx-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
        </>
      )}
      <div className="rlx-row">
        <div>
          <label className="rlx-field-label">Este Release es de la parte de:</label>
          <div className="rlx-tipo-tabs">
            {RELEASE_TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                className={`rlx-tipo-tab ${tipo === t ? "active" : ""}`}
                onClick={() => setTipo(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rlx-section">
        <div className="rlx-section-title">Participantes (derechos de máster)</div>
        {loose && selectedTracks.length > 1 && (
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: -4, marginBottom: 10 }}>
            Estos participantes y porcentajes se aplican a las {selectedTracks.length} canciones elegidas arriba.
          </p>
        )}
        {participants.map((p) => (
          <div key={p.key} className="rlx-participant">
            <div className="rlx-participant-grid">
              <ParticipantNameField
                value={p.nombre}
                onType={(v) => updateParticipant(p.key, { nombre: v, autofilledFrom: null })}
                onPick={(m) =>
                  updateParticipant(p.key, {
                    nombre: m.nombreCompleto || m.nombreArtistico,
                    apellido: m.apellido || p.apellido,
                    dni: m.dni || p.dni,
                    fechaNacimiento: m.fechaNacimiento || p.fechaNacimiento,
                    domicilio: m.direccion || p.domicilio,
                    email: m.email || p.email,
                    autofilledFrom: m.nombreArtistico,
                  })
                }
              />
              <input className="rlx-input" placeholder="Apellido" value={p.apellido} onChange={(e) => updateParticipant(p.key, { apellido: e.target.value })} />
              <input className="rlx-input" placeholder="DNI" value={p.dni} onChange={(e) => updateParticipant(p.key, { dni: e.target.value })} />
              <input className="rlx-input" type="date" placeholder="Fecha de nacimiento" value={p.fechaNacimiento} onChange={(e) => updateParticipant(p.key, { fechaNacimiento: e.target.value })} />
              <input className="rlx-input" placeholder="Domicilio" value={p.domicilio} onChange={(e) => updateParticipant(p.key, { domicilio: e.target.value })} />
              <input className="rlx-input" placeholder="Email" value={p.email} onChange={(e) => updateParticipant(p.key, { email: e.target.value })} />
            </div>
            {p.autofilledFrom && (
              <div className="rlx-autofilled-note">✓ Autocompletado desde la ficha de Publishing de {p.autofilledFrom}</div>
            )}
            <div className="rlx-participant-percent">
              <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>% de participación</span>
              <input
                className="rlx-input"
                placeholder="0%"
                inputMode="decimal"
                value={p.percentRaw}
                onChange={(e) => updateParticipant(p.key, { percentRaw: e.target.value })}
              />
            </div>
            {participants.length > 1 && (
              <button type="button" className="rlx-remove" onClick={() => removeParticipant(p.key)}>
                Quitar participante
              </button>
            )}
          </div>
        ))}
        <button type="button" className="rlx-add" onClick={() => setParticipants((prev) => [...prev, newParticipant()])}>
          + Agregar participante
        </button>
        <div className={`rlx-total ${sum === 10000 ? "ok" : "off"}`}>
          {sum === 10000 ? `${formatX100(sum)}% / 100% ✓` : `${formatX100(sum)}% / 100%`}
        </div>
      </div>

      <div className="rlx-section">
        <label className="rlx-field-label">Comentario para Legales (opcional)</label>
        <textarea
          className="rlx-textarea"
          placeholder="Alguna aclaración para quien recibe este Release..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
      </div>

      {error && <div className="rlx-error">{error}</div>}

      <div className="rlx-submit-bar">
        {!canSubmit && <span className="rlx-submit-hint">Elegí de qué parte es y completá los participantes hasta sumar 100% para enviar.</span>}
        <button type="button" className="rlx-submit-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? "Enviando..." : loose && selectedTracks.length > 1 ? `Enviar ${selectedTracks.length} Releases` : "Enviar Release"}
        </button>
      </div>
    </div>
  );
}
