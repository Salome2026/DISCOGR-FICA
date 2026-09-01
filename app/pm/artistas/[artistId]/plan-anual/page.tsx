"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../../../_shared";
import AnnualPlanTimeline from "./AnnualPlanTimeline";

const ACTION_TYPES = [
  { slug: "plan_marketing", label: "Crear un plan de marketing" },
  { slug: "estrategia_contenido", label: "Definir una estrategia de contenido" },
  { slug: "sesiones_estudio", label: "Coordinar sesiones de estudio" },
  { slug: "contacto_colaboracion", label: "Contactar a un líder o referente para una colaboración" },
  { slug: "gestion_featuring", label: "Buscar y gestionar un featuring" },
  { slug: "contacto_prensa", label: "Contactar al equipo de prensa" },
  { slug: "contacto_comercial", label: "Contactar al área comercial para conseguir marcas o patrocinadores" },
  { slug: "gestion_medios", label: "Gestionar medios de comunicación" },
  { slug: "produccion_audiovisual", label: "Coordinar producción audiovisual" },
  { slug: "videoclip_contenido_redes", label: "Planificar videoclip, visualizer o contenido para redes" },
  { slug: "estrategia_playlists", label: "Crear una estrategia de playlists" },
  { slug: "branding_storytelling", label: "Trabajar branding, estética y storytelling" },
  { slug: "activaciones_shows", label: "Organizar activaciones, shows o presentaciones" },
  { slug: "personalizada", label: "Agregar una acción personalizada" },
];
const ACTION_STATUSES = ["Pendiente", "En proceso", "Realizada", "Cancelada"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const STATUS_TONE: Record<string, string> = {
  Pendiente: "var(--warn-ink)", "En proceso": "var(--accent)", Realizada: "var(--good-ink)", Cancelada: "var(--crit-ink)",
};

type Plan = {
  periodStart: string | null; periodEnd: string | null; objetivoGeneral: string | null;
  objetivosEspecificos: string[]; cantidadLanzamientosProyectados: number | null;
  metasYResultados: string | null; presupuestoEstimado: number | null; resumenEjecutivo: string | null;
  observacionesPm: string | null; observacionesManagement: string | null;
} | null;
type Launch = { id: number; titulo: string; fechaObjetivo: string; objetivo: string | null; notas: string | null };
type Action = {
  id: number; launchId: number | null; actionType: string; customLabel: string | null;
  descripcion: string | null; responsable: string | null; fechaLimite: string | null; estado: string;
};
type QuarterlyReview = { quarter: string; fecha: string | null; observacionesPm: string | null; observacionesManagement: string | null };
type Version = { id: number; label: string | null; createdBy: string; createdAt: string };

const cardStyle: React.CSSProperties = {
  background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)",
  padding: "1.5rem", boxShadow: "var(--shadow-glass)", display: "flex", flexDirection: "column", gap: 16, marginBottom: 24,
};
const labelStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "var(--text-1)" };
const fieldLabel: React.CSSProperties = { fontSize: 13, color: "var(--text-2)", marginBottom: 4, display: "block" };
// Same as fieldLabel, but reserves room for two lines and bottom-aligns the
// text — used for rows of same-height fields (Período y objetivos) so a
// label that wraps to 2 lines doesn't push just its own input down relative
// to the siblings whose labels fit on 1 line.
const rowFieldLabel: React.CSSProperties = { ...fieldLabel, minHeight: 34, display: "flex", alignItems: "flex-end" };
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8,
  padding: "10px 12px", color: "var(--text-1)", fontSize: 14,
};
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: 80, fontFamily: "inherit", resize: "vertical" };
const smallBtn: React.CSSProperties = {
  background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8,
  padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 13, cursor: "pointer", alignSelf: "flex-start",
};
const primaryBtn: React.CSSProperties = {
  background: "var(--accent-gradient)", border: "none", borderRadius: 8, padding: "10px 22px",
  color: "var(--accent-ink)", fontWeight: 700, cursor: "pointer", fontSize: 14,
};
const modalOverlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
};

function formatFecha(fecha: string | null): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function actionLabel(a: Action): string {
  if (a.actionType === "personalizada") return a.customLabel?.trim() || "Acción personalizada";
  return ACTION_TYPES.find((t) => t.slug === a.actionType)?.label ?? a.actionType;
}

function ActionEditor({ action, artistId, onChanged }: { action: Action; artistId: string; onChanged: () => void }) {
  const [descripcion, setDescripcion] = useState(action.descripcion ?? "");
  const [responsable, setResponsable] = useState(action.responsable ?? "");
  const [fechaLimite, setFechaLimite] = useState(action.fechaLimite?.slice(0, 10) ?? "");
  const [estado, setEstado] = useState(action.estado);
  const [customLabel, setCustomLabel] = useState(action.customLabel ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/pm/artistas/${artistId}/plan-anual/acciones/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: descripcion || null, responsable: responsable || null, fechaLimite: fechaLimite || null, estado, customLabel: customLabel || null }),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar esta acción?")) return;
    await fetch(`/api/pm/artistas/${artistId}/plan-anual/acciones/${action.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {action.actionType === "personalizada" ? (
          <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Nombre de la acción personalizada" style={{ ...inputStyle, fontWeight: 700, fontSize: 13 }} />
        ) : (
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{actionLabel(action)}</span>
        )}
        <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_TONE[estado] }}>{estado}</span>
      </div>
      <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción..." style={{ ...textareaStyle, minHeight: 50 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Responsable" style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }}>
          {ACTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={remove} style={{ background: "transparent", border: "none", color: "var(--crit-ink)", cursor: "pointer", fontSize: 12 }}>Eliminar acción</button>
        <button onClick={save} disabled={saving} style={smallBtn}>{saving ? "Guardando..." : "Guardar acción"}</button>
      </div>
    </div>
  );
}

function LaunchCard({ launch, actions, artistId, onChanged }: { launch: Launch; actions: Action[]; artistId: string; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [addingType, setAddingType] = useState("");
  const launchActions = actions.filter((a) => a.launchId === launch.id);

  async function addAction() {
    if (!addingType) return;
    await fetch(`/api/pm/artistas/${artistId}/plan-anual/acciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ launchId: launch.id, actionType: addingType }),
    });
    setAddingType("");
    onChanged();
  }

  async function removeLaunch() {
    if (!confirm(`¿Eliminar el lanzamiento "${launch.titulo}"? También se eliminan sus acciones.`)) return;
    await fetch(`/api/pm/artistas/${artistId}/plan-anual/lanzamientos/${launch.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded((e) => !e)}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{launch.titulo}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>{formatFecha(launch.fechaObjetivo)} · {launchActions.length} {launchActions.length === 1 ? "acción" : "acciones"}</div>
        </div>
        <span style={{ fontSize: 18, color: "var(--text-3)" }}>{expanded ? "−" : "+"}</span>
      </div>
      {expanded && (
        <>
          {launch.objetivo && <div style={{ fontSize: 13, color: "var(--text-2)" }}>{launch.objetivo}</div>}
          {launchActions.map((a) => <ActionEditor key={a.id} action={a} artistId={artistId} onChanged={onChanged} />)}
          <div style={{ display: "flex", gap: 8 }}>
            <select value={addingType} onChange={(e) => setAddingType(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Agregar acción...</option>
              {ACTION_TYPES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
            </select>
            <button onClick={addAction} style={smallBtn}>Agregar</button>
          </div>
          <button onClick={removeLaunch} style={{ background: "transparent", border: "none", color: "var(--crit-ink)", cursor: "pointer", fontSize: 12, alignSelf: "flex-start" }}>
            Eliminar lanzamiento
          </button>
        </>
      )}
    </div>
  );
}

function VersionHistoryModal({ artistId, onClose }: { artistId: string; onClose: () => void }) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [detail, setDetail] = useState<{ label: string | null; snapshot: unknown } | null>(null);

  useEffect(() => {
    fetch(`/api/pm/artistas/${artistId}/plan-anual/versiones`).then((r) => r.json()).then((d) => setVersions(d.versions ?? []));
  }, [artistId]);

  async function openVersion(id: number) {
    const res = await fetch(`/api/pm/artistas/${artistId}/plan-anual/versiones/${id}`);
    const d = await res.json();
    setDetail({ label: d.version.label, snapshot: d.version.snapshot });
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 600, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto", marginBottom: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Historial de versiones</div>
        {!detail ? (
          <>
            {versions === null && <p style={{ color: "var(--text-3)" }}>Cargando...</p>}
            {versions?.length === 0 && <p style={{ color: "var(--text-3)" }}>Todavía no hay versiones guardadas.</p>}
            {versions?.map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.label ?? "Guardado"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>{v.createdBy} · {new Date(v.createdAt).toLocaleString("es-AR")}</div>
                </div>
                <button onClick={() => openVersion(v.id)} style={smallBtn}>Ver</button>
              </div>
            ))}
          </>
        ) : (
          <>
            <button onClick={() => setDetail(null)} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}>
              ← Volver a la lista
            </button>
            <pre style={{ fontSize: 12, background: "var(--bg-2)", padding: 12, borderRadius: 8, overflowX: "auto", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(detail.snapshot, null, 2)}
            </pre>
          </>
        )}
        <button onClick={onClose} style={{ ...smallBtn, alignSelf: "flex-end" }}>Cerrar</button>
      </div>
    </div>
  );
}

function PlanAnualInner({ artistId }: { artistId: string }) {
  const { data: session } = useSession();
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const isManagement = roles.includes("management");

  const [plan, setPlan] = useState<Plan | undefined>(undefined);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [quarterlyReviews, setQuarterlyReviews] = useState<QuarterlyReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [objetivoGeneral, setObjetivoGeneral] = useState("");
  const [objetivosEspecificos, setObjetivosEspecificos] = useState<string[]>([]);
  const [nuevoObjetivo, setNuevoObjetivo] = useState("");
  const [cantidadLanzamientos, setCantidadLanzamientos] = useState("");
  const [metasYResultados, setMetasYResultados] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [resumenEjecutivo, setResumenEjecutivo] = useState("");
  const [observacionesPm, setObservacionesPm] = useState("");
  const [observacionesManagement, setObservacionesManagement] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);

  const [newLaunchTitulo, setNewLaunchTitulo] = useState("");
  const [newLaunchFecha, setNewLaunchFecha] = useState("");

  const [showTimeline, setShowTimeline] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  function load() {
    fetch(`/api/pm/artistas/${artistId}/plan-anual`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setPlan(d.plan);
        setLaunches(d.launches ?? []);
        setActions(d.actions ?? []);
        setQuarterlyReviews(d.quarterlyReviews ?? []);
        setPeriodStart(d.plan?.periodStart?.slice(0, 10) ?? "");
        setPeriodEnd(d.plan?.periodEnd?.slice(0, 10) ?? "");
        setObjetivoGeneral(d.plan?.objetivoGeneral ?? "");
        setObjetivosEspecificos(d.plan?.objetivosEspecificos ?? []);
        setCantidadLanzamientos(d.plan?.cantidadLanzamientosProyectados?.toString() ?? "");
        setMetasYResultados(d.plan?.metasYResultados ?? "");
        setPresupuesto(d.plan?.presupuestoEstimado?.toString() ?? "");
        setResumenEjecutivo(d.plan?.resumenEjecutivo ?? "");
        setObservacionesPm(d.plan?.observacionesPm ?? "");
        setObservacionesManagement(d.plan?.observacionesManagement ?? "");
      });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  async function saveHeader() {
    setSavingHeader(true);
    try {
      await fetch(`/api/pm/artistas/${artistId}/plan-anual`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: periodStart || null, periodEnd: periodEnd || null,
          objetivoGeneral: objetivoGeneral || null, objetivosEspecificos,
          cantidadLanzamientosProyectados: cantidadLanzamientos ? Number(cantidadLanzamientos) : null,
          metasYResultados: metasYResultados || null, presupuestoEstimado: presupuesto ? Number(presupuesto) : null,
          resumenEjecutivo: resumenEjecutivo || null, observacionesPm: observacionesPm || null,
        }),
      });
      load();
    } finally {
      setSavingHeader(false);
    }
  }

  async function saveManagementNotes() {
    await fetch(`/api/management/artistas/${artistId}/plan-anual/observaciones`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observacionesManagement: observacionesManagement || null }),
    });
    load();
  }

  async function addLaunch() {
    if (!newLaunchTitulo.trim() || !newLaunchFecha) return;
    await fetch(`/api/pm/artistas/${artistId}/plan-anual/lanzamientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: newLaunchTitulo.trim(), fechaObjetivo: newLaunchFecha }),
    });
    setNewLaunchTitulo("");
    setNewLaunchFecha("");
    load();
  }

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/pm/artistas/${artistId}/plan-anual/pdf`);
      if (!res.ok) throw new Error("No se pudo generar el PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Plan-Anual.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo generar el PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  const quartersData = useMemo(() => QUARTERS.map((q) => quarterlyReviews.find((r) => r.quarter.endsWith(q)) ?? { quarter: `${new Date().getFullYear()}-${q}`, fecha: null, observacionesPm: null, observacionesManagement: null }), [quarterlyReviews]);

  if (plan === undefined && !error) {
    return <PMShell title="Cargando..." backHref={`/pm/artistas/${artistId}`}><p style={{ color: "var(--text-3)" }}>Cargando...</p></PMShell>;
  }
  if (error) {
    return <PMShell title="No disponible" backHref={`/pm/artistas/${artistId}`}><p style={{ color: "var(--crit-ink)" }}>{error}</p></PMShell>;
  }

  return (
    <PMShell title="Plan Anual" backHref={`/pm/artistas/${artistId}`}>
      <div style={cardStyle}>
        <div style={labelStyle}>Período y objetivos</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={rowFieldLabel}>Fecha de inicio</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} disabled={isManagement} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={rowFieldLabel}>Fecha de finalización</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} disabled={isManagement} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={rowFieldLabel}>Cantidad de lanzamientos proyectados</label>
            <input type="number" min={0} value={cantidadLanzamientos} onChange={(e) => setCantidadLanzamientos(e.target.value)} disabled={isManagement} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={rowFieldLabel}>Presupuesto estimado</label>
            <input type="number" min={0} value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} disabled={isManagement} placeholder="Si corresponde" style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Objetivo general del año</label>
          <textarea value={objetivoGeneral} onChange={(e) => setObjetivoGeneral(e.target.value)} disabled={isManagement} style={textareaStyle} />
        </div>
        <div>
          <label style={fieldLabel}>Objetivos específicos</label>
          {objetivosEspecificos.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input value={o} onChange={(e) => setObjetivosEspecificos((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} disabled={isManagement} style={inputStyle} />
              {!isManagement && (
                <button onClick={() => setObjetivosEspecificos((prev) => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: "var(--crit-ink)", cursor: "pointer" }}>×</button>
              )}
            </div>
          ))}
          {!isManagement && (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={nuevoObjetivo} onChange={(e) => setNuevoObjetivo(e.target.value)} placeholder="Nuevo objetivo específico..." style={inputStyle} />
              <button
                onClick={() => { if (nuevoObjetivo.trim()) { setObjetivosEspecificos((prev) => [...prev, nuevoObjetivo.trim()]); setNuevoObjetivo(""); } }}
                style={smallBtn}
              >
                Agregar
              </button>
            </div>
          )}
        </div>
        <div>
          <label style={fieldLabel}>Metas de crecimiento y resultados esperados</label>
          <textarea value={metasYResultados} onChange={(e) => setMetasYResultados(e.target.value)} disabled={isManagement} style={textareaStyle} />
        </div>
        <div>
          <label style={fieldLabel}>Resumen ejecutivo</label>
          <textarea value={resumenEjecutivo} onChange={(e) => setResumenEjecutivo(e.target.value)} disabled={isManagement} style={textareaStyle} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={fieldLabel}>Observaciones del PM</label>
            <textarea value={observacionesPm} onChange={(e) => setObservacionesPm(e.target.value)} disabled={isManagement} style={textareaStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={fieldLabel}>Observaciones de Management</label>
            <textarea value={observacionesManagement} onChange={(e) => setObservacionesManagement(e.target.value)} disabled={!isManagement} style={textareaStyle} placeholder={isManagement ? "" : "Management todavía no dejó observaciones."} />
          </div>
        </div>
        {!isManagement ? (
          <button onClick={saveHeader} disabled={savingHeader} style={primaryBtn}>{savingHeader ? "Guardando..." : "Guardar plan"}</button>
        ) : (
          <button onClick={saveManagementNotes} style={primaryBtn}>Guardar observaciones</button>
        )}
      </div>

      {!isManagement && (
        <div style={cardStyle}>
          <div style={labelStyle}>Cronograma de lanzamientos</div>
          {launches.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 14 }}>Todavía no hay lanzamientos en el cronograma.</p>}
          {launches.map((l) => <LaunchCard key={l.id} launch={l} actions={actions} artistId={artistId} onChanged={load} />)}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={newLaunchTitulo} onChange={(e) => setNewLaunchTitulo(e.target.value)} placeholder="Título del lanzamiento" style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
            <input type="date" value={newLaunchFecha} onChange={(e) => setNewLaunchFecha(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
            <button onClick={addLaunch} style={smallBtn}>Agregar lanzamiento</button>
          </div>
        </div>
      )}
      {isManagement && launches.length > 0 && (
        <div style={cardStyle}>
          <div style={labelStyle}>Cronograma de lanzamientos</div>
          {launches.map((l) => <LaunchCard key={l.id} launch={l} actions={actions} artistId={artistId} onChanged={load} />)}
        </div>
      )}

      <div style={cardStyle}>
        <div style={labelStyle}>Revisiones trimestrales</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {quartersData.map((q) => (
            <QuarterlyReviewCard key={q.quarter} review={q} artistId={artistId} isManagement={isManagement} onChanged={load} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <button onClick={() => setShowTimeline(true)} style={primaryBtn}>Visualizar línea de tiempo</button>
        <button onClick={downloadPdf} disabled={downloadingPdf} style={primaryBtn}>{downloadingPdf ? "Generando..." : "Descargar plan anual en PDF"}</button>
        <button onClick={() => setShowVersions(true)} style={smallBtn}>Ver historial de versiones</button>
      </div>

      {showTimeline && (
        <div style={modalOverlay} onClick={() => setShowTimeline(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-1)", borderRadius: 12, padding: 24, width: "95vw", maxWidth: 1400, height: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Línea de tiempo — {plan?.periodStart ? `${formatFecha(plan.periodStart)} - ${formatFecha(plan.periodEnd)}` : "Plan anual"}</div>
              <button onClick={() => setShowTimeline(false)} style={smallBtn}>Cerrar</button>
            </div>
            <AnnualPlanTimeline launches={launches} actions={actions} quarterlyReviews={quarterlyReviews} />
          </div>
        </div>
      )}
      {showVersions && <VersionHistoryModal artistId={artistId} onClose={() => setShowVersions(false)} />}
    </PMShell>
  );
}

function QuarterlyReviewCard({
  review, artistId, isManagement, onChanged,
}: { review: QuarterlyReview; artistId: string; isManagement: boolean; onChanged: () => void }) {
  const [fecha, setFecha] = useState(review.fecha?.slice(0, 10) ?? "");
  const [obsPm, setObsPm] = useState(review.observacionesPm ?? "");
  const [obsMgmt, setObsMgmt] = useState(review.observacionesManagement ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      if (isManagement) {
        await fetch(`/api/management/artistas/${artistId}/plan-anual/revisiones/${review.quarter}/observaciones`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ observacionesManagement: obsMgmt || null }),
        });
      } else {
        await fetch(`/api/pm/artistas/${artistId}/plan-anual/revisiones/${review.quarter}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fecha: fecha || null, observacionesPm: obsPm || null }),
        });
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{review.quarter}</div>
      {!isManagement && <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />}
      <textarea value={obsPm} onChange={(e) => setObsPm(e.target.value)} disabled={isManagement} placeholder="Observaciones del PM" style={{ ...textareaStyle, minHeight: 50 }} />
      <textarea value={obsMgmt} onChange={(e) => setObsMgmt(e.target.value)} disabled={!isManagement} placeholder="Observaciones de Management" style={{ ...textareaStyle, minHeight: 50 }} />
      <button onClick={save} disabled={saving} style={smallBtn}>{saving ? "Guardando..." : "Guardar revisión"}</button>
    </div>
  );
}

export default function PlanAnualPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  return (
    <RequireRole allow={["admin", "project_manager", "management"]}>
      <PlanAnualInner artistId={artistId} />
    </RequireRole>
  );
}
