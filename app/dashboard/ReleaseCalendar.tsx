"use client";

import { useEffect, useMemo, useState } from "react";

type PmReleaseRow = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  estado: string;
  distribuidora: string | null;
  fecha_lanzamiento: string | null;
  hora_lanzamiento: string | null;
  colaboradores: string | null;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
  marketing_plan: boolean;
  marketing_plan_detalle: string | null;
  portada_url: string | null;
  image_url?: string | null;
  source?: "sheet";
};

export type CalendarEvent = {
  key: string;
  ids: number[];
  groupId: number | null;
  fecha: string;
  hora: string;
  titulo: string;
  artista: string;
  participantes: string[];
  sello: string | null;
  distribuidora: string | null;
  estado: string;
  marketingPlan: boolean;
  marketingPlanDetalle: string | null;
  tracks: string[];
  portadaUrl: string | null;
  artistImageUrl: string | null;
  source?: "sheet";
};

const SELLO_COLORS: Record<string, string> = {
  "MAWZ Records": "#3fc6d1",
  "Indyana Records": "#8b93e8",
  "Caserio Records": "#e8a1c4",
  Rizzvor: "#e0b975",
  "Cach House": "#8fd0a0",
  Streamings: "#c3c6cf",
};
const DEFAULT_COLOR = "#9a9da8";
export function selloColor(sello: string | null): string {
  return (sello && SELLO_COLORS[sello]) || DEFAULT_COLOR;
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  const r = new Date(d);
  r.setDate(d.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function publishStatus(fecha: string): { label: string; tone: "warn" | "good" } {
  const d = new Date(fecha + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime() ? { label: "Programado", tone: "warn" } : { label: "Publicado", tone: "good" };
}

export default function ReleaseCalendar({
  className = "",
  readOnly = false,
  apiUrl = "/api/pm/releases",
  syncUrl,
}: {
  className?: string;
  readOnly?: boolean;
  apiUrl?: string;
  // When set, POSTs here before every reload — same "pull the sheet, then
  // reload" pattern as app/panel/booking/ShowCalendar.tsx. Server-side
  // rate-limited (see lib/fonogramasSheetSync.ts), so polling every 30s
  // here costs nothing extra when several tabs are open.
  syncUrl?: string;
}) {
  const [rows, setRows] = useState<PmReleaseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    function load() {
      fetch(apiUrl)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) setError(d.error);
          else setRows(d.releases);
        })
        .catch((e) => setError(String(e)));
    }
    function syncAndLoad() {
      if (!syncUrl) {
        load();
        return;
      }
      fetch(syncUrl, { method: "POST" }).catch(() => {}).finally(load);
    }
    syncAndLoad();
    if (!syncUrl) return;
    const interval = setInterval(syncAndLoad, 30000);
    function onVisible() {
      if (document.visibilityState === "visible") syncAndLoad();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [apiUrl, syncUrl]);

  const events = useMemo(() => {
    if (!rows) return [] as CalendarEvent[];
    const byKey = new Map<string, PmReleaseRow[]>();
    for (const r of rows) {
      if (!r.fecha_lanzamiento) continue;
      // Sheet rows have no group_id (the sheet has no EP/album concept) —
      // a compilation channel like "La Juntada de los Artistas" drops many
      // tracks under the same name on the same day, and without grouping
      // each one became its own visually-identical chip (looked like
      // duplicates, and flooded the day cell). Group them the same way an
      // EP/album already groups by fecha+artist instead, mirroring the
      // real group_id grouping below.
      const k =
        r.group_id != null
          ? `g${r.group_id}`
          : r.source === "sheet"
            ? `sheet-${r.artist_name.trim().toLowerCase()}-${String(r.fecha_lanzamiento).slice(0, 10)}`
            : `r${r.id}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(r);
    }
    const out: CalendarEvent[] = [];
    for (const [key, group] of byKey) {
      const first = group[0];
      const participantes = new Set<string>();
      for (const g of group) {
        if (g.colaboradores) {
          for (const c of g.colaboradores.split(",")) {
            const n = c.trim();
            if (n) participantes.add(n);
          }
        }
      }
      out.push({
        key,
        ids: group.map((g) => g.id),
        groupId: first.group_id,
        fecha: String(first.fecha_lanzamiento).slice(0, 10),
        hora: first.hora_lanzamiento || "00:00",
        titulo: first.group_nombre || first.fonograma_nombre,
        artista: first.artist_name,
        participantes: [...participantes],
        sello: first.sello,
        distribuidora: first.distribuidora,
        estado: first.estado,
        marketingPlan: group.some((g) => g.marketing_plan),
        marketingPlanDetalle: group.find((g) => g.marketing_plan_detalle)?.marketing_plan_detalle ?? null,
        tracks: group.map((g) => g.fonograma_nombre),
        portadaUrl: group.find((g) => g.portada_url)?.portada_url ?? null,
        artistImageUrl: group.find((g) => g.image_url)?.image_url ?? null,
        source: first.source,
      });
    }
    out.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return out;
  }, [rows]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!m.has(e.fecha)) m.set(e.fecha, []);
      m.get(e.fecha)!.push(e);
    }
    return m;
  }, [events]);

  function go(delta: number) {
    setCursor((c) => {
      const d = new Date(c);
      if (view === "month") d.setMonth(d.getMonth() + delta);
      else if (view === "week") d.setDate(d.getDate() + delta * 7);
      else d.setDate(d.getDate() + delta);
      return d;
    });
  }

  async function saveMarketingPlan(ev: CalendarEvent, marketingPlan: boolean, detalle: string | null) {
    await fetch(`/api/pm/releases/${ev.ids[0]}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketingPlan, marketingPlanDetalle: detalle, groupId: ev.groupId }),
    });
    setRows((prev) =>
      prev ? prev.map((r) => (ev.ids.includes(r.id) ? { ...r, marketing_plan: marketingPlan, marketing_plan_detalle: detalle } : r)) : prev
    );
    setSelected((s) => (s ? { ...s, marketingPlan, marketingPlanDetalle: detalle } : s));
  }

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = new Date();
  const label =
    view === "month"
      ? `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === "week"
      ? `${weekDays[0].getDate()} ${MESES[weekDays[0].getMonth()].slice(0, 3)} — ${weekDays[6].getDate()} ${MESES[weekDays[6].getMonth()].slice(0, 3)}`
      : `${cursor.getDate()} de ${MESES[cursor.getMonth()]}, ${cursor.getFullYear()}`;

  return (
    <div className={`card cal-card ${className}`}>
      <style>{`
        .cal-card{display:flex;flex-direction:column;height:100%;justify-content:center;}
        .cal-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:.4rem;}
        .cal-title{display:flex;flex-direction:column;gap:1px;}
        .cal-nav{display:flex;align-items:center;gap:3px;}
        .cal-nav button{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:5px;width:17px;height:17px;color:var(--text-2);cursor:pointer;font-size:10px;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);}
        .cal-nav button:hover{color:var(--text-1);border-color:var(--accent-color-glow);}
        .cal-nav .today-btn{width:auto;padding:0 7px;font-size:9px;font-weight:600;}
        .cal-views{display:flex;gap:2px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-pill);padding:2px;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);}
        .cal-view-btn{border:none;background:transparent;border-radius:var(--radius-pill);padding:2px 8px;font-size:9px;font-weight:600;color:var(--text-2);cursor:pointer;}
        .cal-view-btn.active{background:var(--accent-glass-bg);color:var(--text-1);}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
        .cal-dayname{font-size:9px;color:var(--text-2);text-align:center;padding:1px 0 3px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;}
        .cal-cell{min-height:23px;border-radius:6px;border:1px solid var(--line-soft);padding:3px;display:flex;flex-direction:column;gap:1px;transition:border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);}
        .cal-cell.outside{opacity:.35;}
        .cal-cell.today{border-color:var(--accent-color);background:rgba(63,198,209,0.06);}
        .cal-daynum{font-size:10px;font-weight:600;color:var(--text-1);font-variant-numeric:tabular-nums;}
        .cal-chip{display:flex;align-items:center;gap:3px;font-size:9.5px;font-weight:500;padding:1px 4px;border-radius:4px;background:var(--glass-bg);cursor:pointer;overflow:hidden;text-align:left;border:none;color:var(--text-1);width:100%;}
        .cal-chip:hover{background:var(--glass-bg-strong);}
        .cal-chip .dot{width:4px;height:4px;border-radius:50%;flex-shrink:0;}
        .cal-chip-avatar{width:12px;height:12px;border-radius:50%;flex-shrink:0;object-fit:cover;}
        .cal-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cal-more{font-size:9px;font-weight:500;color:var(--text-2);padding:0 4px;}
        .cal-week{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
        .cal-week-col{min-height:100px;border-radius:9px;border:1px solid var(--line-soft);padding:5px;display:flex;flex-direction:column;gap:4px;}
        .cal-week-col.today{border-color:var(--accent-color);background:rgba(63,198,209,0.06);}
        .cal-week-head{font-size:10px;color:var(--text-2);text-align:center;font-weight:600;}
        .cal-week-head .n{font-size:12.5px;font-weight:700;color:var(--text-1);margin-top:1px;font-variant-numeric:tabular-nums;}
        .cal-day-list{display:flex;flex-direction:column;gap:5px;}
        .cal-day-empty{color:var(--text-3);font-size:12px;padding:.6rem 0;text-align:center;}
        .cal-day-item{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:9px;background:var(--glass-bg);border:1px solid var(--glass-border);cursor:pointer;transition:transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);}
        .cal-day-item:hover{background:var(--glass-bg-strong);transform:translateY(-2px);}
        .cal-day-item .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
        .cal-day-item .meta{font-size:11.5px;font-weight:500;color:var(--text-2);margin-top:1px;}
        .cal-day-cover{width:30px;height:30px;border-radius:7px;object-fit:cover;flex-shrink:0;}
        .cal-legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:.75rem;padding-top:.55rem;border-top:1px solid var(--line-soft);}
        .cal-legend-item{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-2);}
        .cal-legend-item .dot{width:6px;height:6px;border-radius:50%;}
      `}</style>

      <div className="cal-header">
        <div className="cal-title">
          <div className="card-label">Próximos lanzamientos</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>{label}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="cal-views">
            {(["day", "week", "month"] as const).map((v) => (
              <button key={v} className={`cal-view-btn${view === v ? " active" : ""}`} onClick={() => setView(v)}>
                {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <div className="cal-nav">
            <button onClick={() => go(-1)} aria-label="Anterior">‹</button>
            <button className="today-btn" onClick={() => setCursor(new Date())}>Hoy</button>
            <button onClick={() => go(1)} aria-label="Siguiente">›</button>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>Error: {error}</p>}
      {!rows && !error && <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>Cargando lanzamientos...</p>}

      {rows && view === "month" && (
        <div className="cal-grid">
          {DIAS.map((d) => (
            <div className="cal-dayname" key={d}>{d}</div>
          ))}
          {monthDays.map((d) => {
            const dayEvents = eventsByDay.get(toKey(d)) ?? [];
            const outside = d.getMonth() !== cursor.getMonth();
            const isToday = isSameDay(d, today);
            const visible = dayEvents.slice(0, 3);
            const extra = dayEvents.length - visible.length;
            return (
              <div key={d.toISOString()} className={`cal-cell${outside ? " outside" : ""}${isToday ? " today" : ""}`}>
                <div className="cal-daynum">{d.getDate()}</div>
                {visible.map((ev) => (
                  <button key={ev.key} className="cal-chip" onClick={() => setSelected(ev)}>
                    <span className="dot" style={{ background: selloColor(ev.sello) }} />
                    {ev.artistImageUrl && <img src={ev.artistImageUrl} alt="" className="cal-chip-avatar" />}
                    <span>{ev.artista}</span>
                  </button>
                ))}
                {extra > 0 && <div className="cal-more">+{extra} más</div>}
              </div>
            );
          })}
        </div>
      )}

      {rows && view === "week" && (
        <div className="cal-week">
          {weekDays.map((d) => {
            const dayEvents = eventsByDay.get(toKey(d)) ?? [];
            const isToday = isSameDay(d, today);
            return (
              <div key={d.toISOString()} className={`cal-week-col${isToday ? " today" : ""}`}>
                <div className="cal-week-head">
                  {DIAS[(d.getDay() + 6) % 7]}
                  <div className="n">{d.getDate()}</div>
                </div>
                {dayEvents.map((ev) => (
                  <button key={ev.key} className="cal-chip" onClick={() => setSelected(ev)}>
                    <span className="dot" style={{ background: selloColor(ev.sello) }} />
                    {ev.artistImageUrl && <img src={ev.artistImageUrl} alt="" className="cal-chip-avatar" />}
                    <span>{ev.titulo}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {rows && view === "day" && (
        <div className="cal-day-list">
          {(eventsByDay.get(toKey(cursor)) ?? []).length === 0 && (
            <div className="cal-day-empty">No hay lanzamientos programados este día.</div>
          )}
          {(eventsByDay.get(toKey(cursor)) ?? []).map((ev) => (
            <div key={ev.key} className="cal-day-item" onClick={() => setSelected(ev)}>
              {ev.portadaUrl ? (
                <img src={ev.portadaUrl} alt="" className="cal-day-cover" />
              ) : (
                <span className="dot" style={{ background: selloColor(ev.sello) }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.titulo}</div>
                <div className="meta">
                  {ev.artista} · {ev.sello ?? "Sin sello"}
                  {ev.marketingPlan ? " · Plan de marketing ✓" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="cal-legend">
        {Object.entries(SELLO_COLORS).map(([name, color]) => (
          <div className="cal-legend-item" key={name}>
            <span className="dot" style={{ background: color }} />
            {name}
          </div>
        ))}
      </div>

      {selected && (
        <EventDetail event={selected} onClose={() => setSelected(null)} onSaveMarketing={saveMarketingPlan} readOnly={readOnly} />
      )}
    </div>
  );
}

export function EventDetail({
  event,
  onClose,
  onSaveMarketing,
  readOnly = false,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onSaveMarketing: (ev: CalendarEvent, marketingPlan: boolean, detalle: string | null) => Promise<void>;
  readOnly?: boolean;
}) {
  const [detalle, setDetalle] = useState(event.marketingPlanDetalle ?? "");
  const [saving, setSaving] = useState(false);
  const status = publishStatus(event.fecha);
  const looksLikeUrl = /^https?:\/\//i.test(event.marketingPlanDetalle ?? "");
  // Rows synced from the external fonogramas sheet have no matching
  // pm_releases row to PATCH — editing marketing plan on them wouldn't
  // persist anywhere, so they're read-only here regardless of the prop.
  readOnly = readOnly || event.source === "sheet";

  async function toggleMarketing() {
    setSaving(true);
    await onSaveMarketing(event, !event.marketingPlan, event.marketingPlan ? null : detalle || null);
    setSaving(false);
  }

  async function saveDetalle() {
    setSaving(true);
    await onSaveMarketing(event, true, detalle || null);
    setSaving(false);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "2rem",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--glass-bg-strong)", backdropFilter: "blur(40px) saturate(1.7)",
          WebkitBackdropFilter: "blur(40px) saturate(1.7)", color: "var(--text-1)", borderRadius: 20,
          border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-glass-lg)", width: "100%",
          maxWidth: 440, padding: "1.75rem", display: "flex", flexDirection: "column", gap: 14,
          maxHeight: "85vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
            {event.portadaUrl && (
              <img
                src={event.portadaUrl}
                alt=""
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: selloColor(event.sello) }} />
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{event.sello ?? "Sin sello"}</span>
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.01em" }}>{event.titulo}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid var(--glass-border)", borderRadius: 8, color: "var(--text-2)", width: 30, height: 30, cursor: "pointer", fontSize: 14 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="kpi-chip" style={{ background: status.tone === "good" ? "var(--good-bg)" : "var(--warn-bg)", color: status.tone === "good" ? "var(--good-ink)" : "var(--warn-ink)" }}>
            {status.label}
          </span>
          <span className="kpi-chip" style={{ background: "var(--bg-2)", color: "var(--text-2)" }}>{event.estado}</span>
        </div>

        <Field
          label="Fecha y hora de lanzamiento"
          value={`${new Date(event.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${event.hora} hs (ART)`}
        />
        <Field label="Artista principal" value={event.artista} />
        <Field label="Participantes / featurings" value={event.participantes.length ? event.participantes.join(", ") : "—"} />
        <Field label="Distribuidora" value={event.distribuidora ?? "—"} />
        {event.tracks.length > 1 && <Field label={`Canciones (${event.tracks.length})`} value={event.tracks.join(", ")} />}

        <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: event.marketingPlan ? 10 : 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Plan de marketing</span>
            {readOnly ? (
              <span
                style={{
                  background: event.marketingPlan ? "var(--good-bg)" : "var(--bg-2)",
                  color: event.marketingPlan ? "var(--good-ink)" : "var(--text-3)",
                  border: "1px solid var(--glass-border)", borderRadius: 100, padding: "5px 14px",
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {event.marketingPlan ? "Sí" : "No"}
              </span>
            ) : (
              <button
                onClick={toggleMarketing}
                disabled={saving}
                style={{
                  background: event.marketingPlan ? "var(--good-bg)" : "var(--glass-bg)",
                  color: event.marketingPlan ? "var(--good-ink)" : "var(--text-2)",
                  border: "1px solid var(--glass-border)", borderRadius: 100, padding: "5px 14px",
                  fontSize: 12, fontWeight: 600, cursor: saving ? "default" : "pointer",
                }}
              >
                {event.marketingPlan ? "Sí" : "No"}
              </button>
            )}
          </div>
          {event.marketingPlan && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {readOnly ? (
                looksLikeUrl ? (
                  <a href={event.marketingPlanDetalle!} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)", fontSize: 12.5 }}>
                    Abrir plan de marketing ↗
                  </a>
                ) : (
                  event.marketingPlanDetalle && <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>{event.marketingPlanDetalle}</div>
                )
              ) : (
                <>
                  <input
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    onBlur={saveDetalle}
                    placeholder="Link o notas del plan de marketing"
                    style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", color: "var(--text-1)", fontSize: 13 }}
                  />
                  {looksLikeUrl && (
                    <a href={event.marketingPlanDetalle!} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)", fontSize: 12.5 }}>
                      Abrir plan de marketing ↗
                    </a>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5 }}>{value}</div>
    </div>
  );
}
