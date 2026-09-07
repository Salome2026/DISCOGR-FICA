"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import RequirePermission from "@/app/components/RequirePermission";

type Persona = { name: string; avatarUrl: string | null; tone: string; description: string };
type Thresholds = {
  explodingGrowthPct: number;
  producerRepeatMinArtists: number;
  producerRepeatWindowDays: number;
  stalledMinDaysSinceRelease: number;
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8,
  padding: "9px 12px", color: "var(--text-1)", fontSize: 13.5, marginTop: 4,
};
const fieldLabel: React.CSSProperties = { fontSize: 12.5, color: "var(--text-2)" };
const primaryBtn: React.CSSProperties = {
  background: "var(--accent-gradient)", border: "none", borderRadius: 8, padding: "9px 20px",
  color: "var(--accent-ink)", fontWeight: 700, cursor: "pointer", fontSize: 13.5,
};

function ConfiguracionInner() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [criteria, setCriteria] = useState<string>("");
  const [criteriaLoaded, setCriteriaLoaded] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [criteriaSaved, setCriteriaSaved] = useState(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdsSaved, setThresholdsSaved] = useState(false);
  const [thresholdsError, setThresholdsError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ar/agent-status")
      .then((r) => r.json())
      .then((d) => setPersona(d.persona));
    fetch("/api/ar/scouting-criteria")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "No se pudo cargar el documento de criterios.");
        setCriteria(d.criteria?.text ?? "");
        setCriteriaLoaded(true);
      })
      .catch((err) => setCriteriaError(err instanceof Error ? err.message : "Error desconocido."));
    fetch("/api/ar/alert-thresholds")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "No se pudieron cargar los umbrales.");
        setThresholds(d.thresholds);
      })
      .catch((err) => setThresholdsError(err instanceof Error ? err.message : "Error desconocido."));
  }, []);

  // Guards against the field going blank mid-edit collapsing to 0 (Number("")
  // is 0, not NaN) — that would silently push explodingGrowthPct below the
  // server's floor and surface only a generic "Umbrales inválidos." error.
  function updateThreshold<K extends keyof Thresholds>(key: K, raw: string, toStored: (n: number) => number = (n) => n) {
    if (raw === "") return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setThresholds((prev) => (prev ? { ...prev, [key]: toStored(n) } : prev));
  }

  async function saveThresholds() {
    if (!thresholds) return;
    setSavingThresholds(true);
    setThresholdsError(null);
    setThresholdsSaved(false);
    try {
      const res = await fetch("/api/ar/alert-thresholds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholds),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo guardar.");
      setThresholds(d.thresholds);
      setThresholdsSaved(true);
      setTimeout(() => setThresholdsSaved(false), 2500);
    } catch (err) {
      setThresholdsError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSavingThresholds(false);
    }
  }

  async function saveCriteria() {
    if (!criteria.trim()) {
      setCriteriaError("El documento no puede quedar vacío.");
      return;
    }
    setSavingCriteria(true);
    setCriteriaError(null);
    setCriteriaSaved(false);
    try {
      const res = await fetch("/api/ar/scouting-criteria", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: criteria }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo guardar.");
      setCriteria(d.criteria.text);
      setCriteriaSaved(true);
      setTimeout(() => setCriteriaSaved(false), 2500);
    } catch (err) {
      setCriteriaError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSavingCriteria(false);
    }
  }

  async function handleAvatarChange(file: File) {
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/ar/upload" });
      setPersona((p) => (p ? { ...p, avatarUrl: blob.url } : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!persona) return;
    if (!persona.name.trim() || !persona.tone.trim() || !persona.description.trim()) {
      setError("Completá nombre, tono y descripción.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/ar/persona", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persona),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo guardar.");
      setPersona(d.persona);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  if (!persona) {
    return (
      <div className="bg-atmosphere" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
        Cargando...
      </div>
    );
  }

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Link href="/panel/ar" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>← Volver a A&R</Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 0" }}>Configurar el agente de A&R</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Cambiá nombre, avatar, tono y descripción — el widget flotante y el chat lo reflejan al instante, sin redeploy.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, color: "var(--accent-ink)", overflow: "hidden", flexShrink: 0 }}>
            {persona.avatarUrl ? (
              <img src={persona.avatarUrl} alt={persona.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              persona.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <label style={{ fontSize: 12.5, color: "var(--accent)", cursor: "pointer" }}>
            {uploading ? "Subiendo..." : "Cambiar foto"}
            <input
              type="file"
              accept="image/png,image/jpeg"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
              disabled={uploading}
            />
          </label>
        </div>

        <div>
          <div style={fieldLabel}>Nombre</div>
          <input value={persona.name} onChange={(e) => setPersona({ ...persona, name: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={fieldLabel}>Tono</div>
          <input
            value={persona.tone}
            onChange={(e) => setPersona({ ...persona, tone: e.target.value })}
            placeholder="ej. directo, curioso y estratégico"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={fieldLabel}>Descripción</div>
          <textarea
            value={persona.description}
            onChange={(e) => setPersona({ ...persona, description: e.target.value })}
            style={{ ...inputStyle, minHeight: 90, fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
        {saved && <div style={{ color: "var(--good-ink)", fontSize: 13 }}>Guardado.</div>}
        <div>
          <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        </div>

        <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 18, marginTop: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Criterios de scouting</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4 }}>
            Lo que el equipo de A&R busca en un candidato externo — se usa como vara real cada vez que se genera una evaluación de scouting.
          </p>
          {criteriaLoaded && (
            <>
              <textarea
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                style={{ ...inputStyle, minHeight: 140, fontFamily: "inherit", resize: "vertical", marginTop: 10 }}
              />
              {criteriaError && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginTop: 8 }}>{criteriaError}</div>}
              {criteriaSaved && <div style={{ color: "var(--good-ink)", fontSize: 13, marginTop: 8 }}>Guardado.</div>}
              <div style={{ marginTop: 10 }}>
                <button onClick={saveCriteria} disabled={savingCriteria} style={primaryBtn}>
                  {savingCriteria ? "Guardando..." : "Guardar criterios"}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 18, marginTop: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Umbrales de alertas</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4 }}>
            Cuándo el agente dispara cada tipo de alerta — ajustalos si están saltando de más o de menos.
          </p>
          {!thresholds && thresholdsError && (
            <div style={{ color: "var(--crit-ink)", fontSize: 13, marginTop: 10 }}>{thresholdsError}</div>
          )}
          {thresholds && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                <div>
                  <div style={fieldLabel}>Crecimiento para &quot;artista explotando&quot; (%)</div>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={Math.round(thresholds.explodingGrowthPct * 100)}
                    onChange={(e) => updateThreshold("explodingGrowthPct", e.target.value, (n) => n / 100)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={fieldLabel}>Mín. artistas con mismo productor</div>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={thresholds.producerRepeatMinArtists}
                    onChange={(e) => updateThreshold("producerRepeatMinArtists", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={fieldLabel}>Ventana de días para productor repetido</div>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={thresholds.producerRepeatWindowDays}
                    onChange={(e) => updateThreshold("producerRepeatWindowDays", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={fieldLabel}>Días sin lanzar para &quot;artista estancado&quot;</div>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={thresholds.stalledMinDaysSinceRelease}
                    onChange={(e) => updateThreshold("stalledMinDaysSinceRelease", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              {thresholdsError && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginTop: 8 }}>{thresholdsError}</div>}
              {thresholdsSaved && <div style={{ color: "var(--good-ink)", fontSize: 13, marginTop: 8 }}>Guardado.</div>}
              <div style={{ marginTop: 10 }}>
                <button onClick={saveThresholds} disabled={savingThresholds} style={primaryBtn}>
                  {savingThresholds ? "Guardando..." : "Guardar umbrales"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ArAgentConfigPage() {
  return (
    <RequirePermission need="editar_ar">
      <ConfiguracionInner />
    </RequirePermission>
  );
}
