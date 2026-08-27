"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../../../_shared";
import { RELEASE_PARTICIPANT_TIPOS, type ReleaseParticipantTipo } from "@discografica/shared/types/legalReleaseRequests";

const RLX_STYLES = `
  .rlx-field-label { font-size:12.5px; color:var(--text-2); margin-bottom:6px; display:block; font-weight:600; }
  .rlx-input { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:9px 12px; color:var(--text-1); font-size:13.5px; }
  .rlx-row { display:flex; gap:10px; margin-bottom:12px; }
  .rlx-row > div { flex:1; }

  .rlx-section { margin-top:1.5rem; }
  .rlx-section-title { font-size:15px; font-weight:700; letter-spacing:.02em; margin-bottom:10px; }
  .rlx-participant { background:var(--bg-2); border:1px solid var(--line-soft); border-radius:10px; padding:12px; margin-bottom:10px; }
  .rlx-participant-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .rlx-participant-percent { display:flex; align-items:center; gap:8px; margin-top:8px; }
  .rlx-participant-percent input { width:90px; text-align:right; }
  .rlx-tipo-tabs { display:flex; gap:6px; margin-bottom:14px; }
  .rlx-tipo-tab { flex:1; background:var(--bg-1); border:1px solid var(--line-soft); border-radius:8px; padding:10px; color:var(--text-2); cursor:pointer; font-size:13px; font-weight:600; text-align:center; }
  .rlx-tipo-tab:hover { border-color:var(--accent-color); }
  .rlx-tipo-tab.active { background:var(--accent-glass-bg); border-color:var(--accent-color); color:var(--text-1); }
  .rlx-tipo-tab .rlx-tipo-sub { display:block; font-size:11px; font-weight:500; color:var(--text-3); margin-top:2px; }
  .rlx-tipo-tab.active .rlx-tipo-sub { color:var(--text-2); }
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
  };
}

function emptyGroups(): Record<ReleaseParticipantTipo, ParticipantRow[]> {
  return { Artista: [], Sello: [], PPD: [] };
}

function groupSum(rows: ParticipantRow[]): number {
  return rows.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
}

type FonogramaInfo = {
  id: number;
  fonograma_nombre: string;
  artist_name: string;
  sello: string | null;
  fecha_lanzamiento: string | null;
  group_nombre: string | null;
};

export default function ReleaseFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="Completar Release" subtitle="Datos de derechos de máster para Legales." backHref="/pm/fonograma">
        <ReleaseForm pmReleaseId={Number(id)} />
      </PMShell>
    </RequireRole>
  );
}

function ReleaseForm({ pmReleaseId }: { pmReleaseId: number }) {
  const router = useRouter();
  const [fonograma, setFonograma] = useState<FonogramaInfo | null | undefined>(undefined);
  const [trackName, setTrackName] = useState("");
  const [artistDisplay, setArtistDisplay] = useState("");
  const [sello, setSello] = useState("");
  const [fecha, setFecha] = useState("");
  const [activeTipo, setActiveTipo] = useState<ReleaseParticipantTipo>("Artista");
  const [groups, setGroups] = useState<Record<ReleaseParticipantTipo, ParticipantRow[]>>(() => {
    const g = emptyGroups();
    g.Artista = [newParticipant()];
    return g;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
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

  function updateParticipant(tipo: ReleaseParticipantTipo, key: string, patch: Partial<ParticipantRow>) {
    setGroups((prev) => ({ ...prev, [tipo]: prev[tipo].map((p) => (p.key === key ? { ...p, ...patch } : p)) }));
  }
  function removeParticipant(tipo: ReleaseParticipantTipo, key: string) {
    setGroups((prev) => ({ ...prev, [tipo]: prev[tipo].filter((p) => p.key !== key) }));
  }
  function addParticipant(tipo: ReleaseParticipantTipo) {
    setGroups((prev) => ({ ...prev, [tipo]: [...prev[tipo], newParticipant()] }));
  }

  const allRows = [...groups.Artista, ...groups.Sello, ...groups.PPD];
  const sum = groupSum(allRows);
  const hasAnyParticipant = allRows.length > 0;
  const rowsReady = allRows.every((p) => p.nombre.trim() && (parsePercent(p.percentRaw) ?? 0) > 0);
  const canSubmit = !!fonograma && trackName.trim() && artistDisplay.trim() && sum === 10000 && hasAnyParticipant && rowsReady;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pm/release-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pmReleaseId,
          trackName: trackName.trim(),
          artistDisplay: artistDisplay.trim(),
          sello: sello || null,
          fechaLanzamiento: fecha || null,
          participants: RELEASE_PARTICIPANT_TIPOS.flatMap((tipo) =>
            groups[tipo].map((p) => ({
              nombre: p.nombre.trim(),
              apellido: p.apellido.trim() || null,
              dni: p.dni.trim() || null,
              fechaNacimiento: p.fechaNacimiento.trim() || null,
              domicilio: p.domicilio.trim() || null,
              email: p.email.trim() || null,
              tipo,
              percentX100: parsePercent(p.percentRaw) ?? 0,
            }))
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el Release.");
      setDone(true);
      setTimeout(() => router.push("/pm/fonograma"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (fonograma === undefined) {
    return (
      <div className="pmx-card">
        <p style={{ color: "var(--text-3)" }}>Cargando fonograma...</p>
      </div>
    );
  }
  if (fonograma === null) {
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
        <div className="rlx-success">✓ Listo. El Release ya está en Legales.</div>
      </div>
    );
  }

  return (
    <div className="pmx-card">
      <style>{RLX_STYLES}</style>

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

      <div className="rlx-section">
        <div className="rlx-section-title">Participantes (derechos de máster)</div>

        <div className="rlx-tipo-tabs">
          {RELEASE_PARTICIPANT_TIPOS.map((tipo) => (
            <button
              key={tipo}
              type="button"
              className={`rlx-tipo-tab ${activeTipo === tipo ? "active" : ""}`}
              onClick={() => setActiveTipo(tipo)}
            >
              {tipo}
              <span className="rlx-tipo-sub">
                {groups[tipo].length === 0 ? "Sin participantes" : `${formatX100(groupSum(groups[tipo]))}%`}
              </span>
            </button>
          ))}
        </div>

        {groups[activeTipo].map((p) => (
          <div key={p.key} className="rlx-participant">
            <div className="rlx-participant-grid">
              <input className="rlx-input" placeholder="Nombre" value={p.nombre} onChange={(e) => updateParticipant(activeTipo, p.key, { nombre: e.target.value })} />
              <input className="rlx-input" placeholder="Apellido" value={p.apellido} onChange={(e) => updateParticipant(activeTipo, p.key, { apellido: e.target.value })} />
              <input className="rlx-input" placeholder="DNI" value={p.dni} onChange={(e) => updateParticipant(activeTipo, p.key, { dni: e.target.value })} />
              <input className="rlx-input" type="date" placeholder="Fecha de nacimiento" value={p.fechaNacimiento} onChange={(e) => updateParticipant(activeTipo, p.key, { fechaNacimiento: e.target.value })} />
              <input className="rlx-input" placeholder="Domicilio" value={p.domicilio} onChange={(e) => updateParticipant(activeTipo, p.key, { domicilio: e.target.value })} />
              <input className="rlx-input" placeholder="Email" value={p.email} onChange={(e) => updateParticipant(activeTipo, p.key, { email: e.target.value })} />
            </div>
            <div className="rlx-participant-percent">
              <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>% de participación</span>
              <input
                className="rlx-input"
                placeholder="0%"
                inputMode="decimal"
                value={p.percentRaw}
                onChange={(e) => updateParticipant(activeTipo, p.key, { percentRaw: e.target.value })}
              />
            </div>
            <button type="button" className="rlx-remove" onClick={() => removeParticipant(activeTipo, p.key)}>
              Quitar participante
            </button>
          </div>
        ))}
        <button type="button" className="rlx-add" onClick={() => addParticipant(activeTipo)}>
          + Agregar participante de {activeTipo}
        </button>

        <div className={`rlx-total ${sum === 10000 ? "ok" : "off"}`}>
          Total ({RELEASE_PARTICIPANT_TIPOS.map((t) => `${t} ${formatX100(groupSum(groups[t]))}%`).join(" + ")}):{" "}
          {sum === 10000 ? `${formatX100(sum)}% / 100% ✓` : `${formatX100(sum)}% / 100%`}
        </div>
      </div>

      {error && <div className="rlx-error">{error}</div>}

      <div className="rlx-submit-bar">
        {!canSubmit && <span className="rlx-submit-hint">Completá los participantes hasta sumar 100% para enviar.</span>}
        <button type="button" className="rlx-submit-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? "Enviando..." : "Enviar Release"}
        </button>
      </div>
    </div>
  );
}
