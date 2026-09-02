"use client";

import { useEffect, useMemo, useState } from "react";
import { CM_TIPO_LABELS, CM_ESTADO_LABELS, ContentItemModal, accountColor, type CmContentListItem, type CmAccountLite } from "./_shared";
import { CM_PLATAFORMAS } from "@/lib/db/cmContent";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7;
  const s = new Date(d);
  s.setDate(d.getDate() - offset);
  return s;
}

const ESTADO_DOT: Record<string, string> = {
  idea: "var(--text-2)", pendiente_material: "var(--warn-ink, #e6a028)", en_produccion: "var(--warn-ink, #e6a028)",
  listo: "var(--text-1)", programado: "var(--text-1)", publicado: "var(--good-ink)", cancelado: "var(--crit-ink)",
};

const PLATAFORMA_ABBR: Record<string, string> = {
  Instagram: "IG", TikTok: "TT", "YouTube Shorts": "YT", Otra: "Otra",
};

// Calendario de contenidos de CM — mes/semana, multi-item por día, filtros
// por artista/cuenta/plataforma/estado, identificación visual por cuenta
// (accountColor) + estado (ESTADO_DOT) + plataforma. Autocontenido, mismo
// criterio que ReleaseCalendar.tsx: fetchea sus propios datos, no depende
// de que el padre le pase items/accounts ya cargados.
export default function ContentCalendar({ className = "" }: { className?: string }) {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [items, setItems] = useState<CmContentListItem[] | null>(null);
  const [accounts, setAccounts] = useState<CmAccountLite[]>([]);
  const [showNew, setShowNew] = useState<string | null>(null);
  const [selected, setSelected] = useState<CmContentListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterArtist, setFilterArtist] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterPlataforma, setFilterPlataforma] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);
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

  const visibleDays = view === "month" ? monthDays : weekDays;
  const start = toKey(visibleDays[0]);
  const end = toKey(visibleDays[visibleDays.length - 1]);
  const label = view === "month"
    ? `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`
    : `${weekDays[0].getDate()} ${MESES[weekDays[0].getMonth()].slice(0, 3)} — ${weekDays[6].getDate()} ${MESES[weekDays[6].getMonth()].slice(0, 3)}`;

  function load() {
    fetch(`/api/cm/contenidos?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setItems(d.items)));
  }
  useEffect(load, [start, end]);
  useEffect(() => {
    fetch("/api/cm/cuentas").then((r) => r.json()).then((d) => !d.error && setAccounts(d.accounts));
  }, []);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items ?? []) if (it.artistName) set.add(it.artistName);
    return [...set].sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return (items ?? []).filter((it) =>
      (!filterArtist || it.artistName === filterArtist) &&
      (!filterAccount || it.accountId === filterAccount) &&
      (!filterPlataforma || it.plataforma === filterPlataforma) &&
      (!filterEstado || it.estado === filterEstado)
    );
  }, [items, filterArtist, filterAccount, filterPlataforma, filterEstado]);

  const byDate = useMemo(() => {
    const m = new Map<string, CmContentListItem[]>();
    for (const it of filteredItems) {
      const k = it.fecha.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [filteredItems]);

  const today = new Date();

  return (
    <div className={className}>
      <style>{`
        .cm-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
        .cm-cal-dayname{font-size:10.5px;color:var(--text-3);text-align:center;padding:2px 0 6px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;}
        .cm-cal-cell{min-height:78px;border:1px solid var(--line-soft);border-radius:6px;padding:4px;display:flex;flex-direction:column;gap:2px;}
        .cm-cal-cell.outside{opacity:.35;}
        .cm-cal-cell.today{border-color:var(--text-1);}
        .cm-cal-cell.week{min-height:160px;}
        .cm-cal-daynum{font-size:11px;font-weight:600;color:var(--text-1);}
        .cm-cal-chip{display:flex;align-items:center;gap:4px;font-size:10.5px;padding:2px 4px 2px 6px;border-radius:4px;background:var(--bg-1);border:none;border-left:3px solid var(--text-2);color:var(--text-1);width:100%;cursor:pointer;text-align:left;overflow:hidden;}
        .cm-cal-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cm-cal-chip .dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
        .cm-cal-chip .plat{font-size:9px;font-weight:700;color:var(--text-3);flex-shrink:0;}
        .cm-cal-more{font-size:10px;color:var(--text-3);padding:0 4px;}
        @media (max-width: 640px) {
          .cm-cal-cell{min-height:50px;}
          .cm-cal-chip span{display:none;}
        }
      `}</style>

      {error && <div className="cm-badge crit" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="cm-btn-ghost" onClick={() => setCursor(view === "month" ? new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1) : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7))}>‹</button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
          <button className="cm-btn-ghost" onClick={() => setCursor(view === "month" ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7))}>›</button>
          <button className="cm-btn-ghost" onClick={() => setCursor(new Date())}>Hoy</button>
          <div style={{ display: "flex", gap: 2, marginLeft: 6 }}>
            <button className="cm-btn-ghost" style={view === "month" ? { background: "var(--text-1)", color: "var(--bg-1)" } : undefined} onClick={() => setView("month")}>Mes</button>
            <button className="cm-btn-ghost" style={view === "week" ? { background: "var(--text-1)", color: "var(--bg-1)" } : undefined} onClick={() => setView("week")}>Semana</button>
          </div>
        </div>
        <button className="cm-btn" onClick={() => setShowNew(toKey(today))}>+ Nuevo contenido</button>
      </div>

      <div className="cm-filter-row">
        <select value={filterArtist} onChange={(e) => setFilterArtist(e.target.value)}>
          <option value="">Todos los artistas</option>
          {artistOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
          <option value="">Todas las cuentas</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterPlataforma} onChange={(e) => setFilterPlataforma(e.target.value)}>
          <option value="">Todas las plataformas</option>
          {CM_PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(CM_ESTADO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {!items ? (
        <p className="cm-empty">Cargando...</p>
      ) : (
        <div className="cm-cal-grid">
          {DIAS.map((d) => <div key={d} className="cm-cal-dayname">{d}</div>)}
          {visibleDays.map((d) => {
            const key = toKey(d);
            const dayItems = byDate.get(key) ?? [];
            const outside = view === "month" && d.getMonth() !== cursor.getMonth();
            const cap = view === "week" ? 8 : 3;
            const visible = dayItems.slice(0, cap);
            const extra = dayItems.length - visible.length;
            return (
              <div
                key={key}
                className={`cm-cal-cell${view === "week" ? " week" : ""}${outside ? " outside" : ""}${isSameDay(d, today) ? " today" : ""}`}
                onDoubleClick={() => setShowNew(key)}
              >
                <div className="cm-cal-daynum">{d.getDate()}</div>
                {visible.map((it) => (
                  <button
                    key={it.id}
                    className="cm-cal-chip"
                    style={{ borderLeftColor: accountColor(it.accountId) }}
                    onClick={() => setSelected(it)}
                  >
                    <span className="dot" style={{ background: ESTADO_DOT[it.estado] ?? "var(--text-2)" }} />
                    <span>{it.hora ? `${it.hora} ` : ""}{it.titulo || CM_TIPO_LABELS[it.tipoContenido] || it.tipoContenido}</span>
                    {it.plataforma && <span className="plat">{PLATAFORMA_ABBR[it.plataforma] ?? it.plataforma}</span>}
                  </button>
                ))}
                {extra > 0 && <div className="cm-cal-more">+{extra} más</div>}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <ContentItemModal
          item={null}
          accounts={accounts}
          defaultFecha={showNew}
          onClose={() => setShowNew(null)}
          onChanged={() => { setShowNew(null); load(); }}
        />
      )}

      {selected && (
        <ContentItemModal
          item={selected}
          accounts={accounts}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
