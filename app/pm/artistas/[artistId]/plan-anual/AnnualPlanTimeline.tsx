"use client";

import { useState } from "react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const ACTION_TYPE_LABELS: Record<string, string> = {
  plan_marketing: "Crear un plan de marketing",
  estrategia_contenido: "Definir una estrategia de contenido",
  sesiones_estudio: "Coordinar sesiones de estudio",
  contacto_colaboracion: "Contactar a un líder o referente para una colaboración",
  gestion_featuring: "Buscar y gestionar un featuring",
  contacto_prensa: "Contactar al equipo de prensa",
  contacto_comercial: "Contactar al área comercial para conseguir marcas o patrocinadores",
  gestion_medios: "Gestionar medios de comunicación",
  produccion_audiovisual: "Coordinar producción audiovisual",
  videoclip_contenido_redes: "Planificar videoclip, visualizer o contenido para redes",
  estrategia_playlists: "Crear una estrategia de playlists",
  branding_storytelling: "Trabajar branding, estética y storytelling",
  activaciones_shows: "Organizar activaciones, shows o presentaciones",
  personalizada: "Acción personalizada",
};
const QUARTER_CLOSING_MONTH: Record<string, number> = { Q1: 3, Q2: 6, Q3: 9, Q4: 12 };

type Launch = { id: number; titulo: string; fechaObjetivo: string; objetivo: string | null; notas: string | null };
type Action = {
  id: number; launchId: number | null; actionType: string; customLabel: string | null;
  descripcion: string | null; responsable: string | null; fechaLimite: string | null; estado: string;
};
type QuarterlyReview = { quarter: string; fecha: string | null; observacionesPm: string | null; observacionesManagement: string | null };

type TimelineItem = {
  key: string;
  kind: "lanzamiento" | "accion" | "revision";
  month: number; // 1-12
  titulo: string;
  objetivo: string | null;
  responsables: string[];
  fecha: string | null;
  estado: string | null;
};

function formatFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function monthOf(dateStr: string): number {
  return Number(dateStr.slice(5, 7));
}

export default function AnnualPlanTimeline({
  launches, actions, quarterlyReviews,
}: { launches: Launch[]; actions: Action[]; quarterlyReviews: QuarterlyReview[] }) {
  const [selected, setSelected] = useState<TimelineItem | null>(null);

  const items: TimelineItem[] = [];
  for (const l of launches) {
    const launchActions = actions.filter((a) => a.launchId === l.id);
    const responsables = [...new Set(launchActions.map((a) => a.responsable).filter((r): r is string => !!r))];
    items.push({
      key: `launch-${l.id}`, kind: "lanzamiento", month: monthOf(l.fechaObjetivo),
      titulo: l.titulo, objetivo: l.objetivo, responsables, fecha: l.fechaObjetivo,
      estado: launchActions.length === 0 ? null : launchActions.every((a) => a.estado === "Realizada") ? "Completado" : "En proceso",
    });
  }
  for (const a of actions.filter((a) => a.launchId === null && a.fechaLimite)) {
    items.push({
      key: `action-${a.id}`, kind: "accion", month: monthOf(a.fechaLimite as string),
      titulo: a.actionType === "personalizada" ? (a.customLabel?.trim() || "Acción personalizada") : ACTION_TYPE_LABELS[a.actionType] ?? a.actionType,
      objetivo: a.descripcion, responsables: a.responsable ? [a.responsable] : [], fecha: a.fechaLimite, estado: a.estado,
    });
  }
  for (const q of quarterlyReviews) {
    const month = q.fecha ? monthOf(q.fecha) : QUARTER_CLOSING_MONTH[q.quarter.slice(-2)] ?? 12;
    items.push({
      key: `review-${q.quarter}`, kind: "revision", month,
      titulo: `Revisión trimestral ${q.quarter}`, objetivo: q.observacionesPm, responsables: [], fecha: q.fecha, estado: null,
    });
  }

  const byMonth = new Map<number, TimelineItem[]>();
  for (let m = 1; m <= 12; m++) byMonth.set(m, []);
  for (const it of items) byMonth.get(it.month)?.push(it);

  const kindColor: Record<string, string> = {
    lanzamiento: "var(--accent-glass-bg)", accion: "var(--bg-2)", revision: "var(--warn-bg)",
  };
  const kindBorder: Record<string, string> = {
    lanzamiento: "var(--accent-glass-border)", accion: "var(--line-soft)", revision: "var(--warn-ink)",
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 8 }}>
        {MESES.map((mes, i) => {
          const month = i + 1;
          const monthItems = byMonth.get(month) ?? [];
          return (
            <div key={month} style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 320 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", textAlign: "center", paddingBottom: 6, borderBottom: "1px solid var(--line-soft)" }}>
                {mes}
              </div>
              {monthItems.map((it) => (
                <div
                  key={it.key}
                  onClick={() => setSelected(it)}
                  style={{
                    background: kindColor[it.kind], border: `1px solid ${kindBorder[it.kind]}`, borderRadius: 8,
                    padding: "8px 10px", fontSize: 11.5, cursor: "pointer", lineHeight: 1.35,
                  }}
                  title={it.titulo}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                    {it.kind === "lanzamiento" ? "🎵" : it.kind === "revision" ? "📋" : "✅"} {it.titulo}
                  </div>
                  {it.estado && <div style={{ color: "var(--text-3)" }}>{it.estado}</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 20, fontSize: 12, color: "var(--text-3)" }}>
        <span>🎵 Lanzamiento</span>
        <span>✅ Acción</span>
        <span>📋 Revisión trimestral</span>
      </div>

      {selected && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 20, width: 420, maxWidth: "95vw", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ fontSize: 17, fontWeight: 700 }}>{selected.titulo}</div>
            {selected.objetivo && <div style={{ fontSize: 13.5, color: "var(--text-2)" }}>{selected.objetivo}</div>}
            <div style={{ fontSize: 13 }}>Fecha: {formatFecha(selected.fecha)}</div>
            {selected.responsables.length > 0 && <div style={{ fontSize: 13 }}>Responsables: {selected.responsables.join(", ")}</div>}
            {selected.estado && <div style={{ fontSize: 13 }}>Estado: {selected.estado}</div>}
            <button onClick={() => setSelected(null)} style={{ background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 13, cursor: "pointer", alignSelf: "flex-end" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
