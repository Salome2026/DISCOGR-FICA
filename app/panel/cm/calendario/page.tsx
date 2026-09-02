"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CM_TIPO_LABELS, CM_ESTADO_LABELS } from "../_shared";
import { CM_TIPOS_CONTENIDO, CM_ESTADOS } from "@/lib/db/cmContent";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";

type ContentItem = {
  id: number; accountId: string; artistName: string | null; tipoContenido: string;
  fecha: string; hora: string | null; estado: string; copyText: string | null;
};
type Account = { id: string; name: string };

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const ESTADO_DOT: Record<string, string> = {
  idea: "var(--text-2)", pendiente_material: "var(--warn-ink, #e6a028)", en_produccion: "var(--warn-ink, #e6a028)",
  listo: "var(--text-1)", programado: "var(--text-1)", publicado: "var(--good-ink)", cancelado: "var(--crit-ink)",
};

function CmCalendarioInner() {
  const [cursor, setCursor] = useState(new Date());
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showNew, setShowNew] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Grilla de 42 celdas (6 semanas), arrancando el lunes de la semana que
  // contiene el día 1 del mes — mismo cálculo que ReleaseCalendar.tsx.
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

  const start = toKey(monthDays[0]);
  const end = toKey(monthDays[41]);
  const label = `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;

  function load() {
    fetch(`/api/cm/contenidos?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setItems(d.items)));
  }
  useEffect(load, [start, end]);
  useEffect(() => {
    fetch("/api/cm/cuentas").then((r) => r.json()).then((d) => !d.error && setAccounts(d.accounts));
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, ContentItem[]>();
    for (const it of items ?? []) {
      const k = it.fecha.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [items]);

  const today = new Date();

  return (
    <CmShell title="Calendario de contenidos" subtitle="Lanzamientos y publicaciones planificadas" active="calendario">
      <style>{`
        .cm-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
        .cm-cal-dayname{font-size:10.5px;color:var(--text-3);text-align:center;padding:2px 0 6px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;}
        .cm-cal-cell{min-height:78px;border:1px solid var(--line-soft);border-radius:6px;padding:4px;display:flex;flex-direction:column;gap:2px;}
        .cm-cal-cell.outside{opacity:.35;}
        .cm-cal-cell.today{border-color:var(--text-1);}
        .cm-cal-daynum{font-size:11px;font-weight:600;color:var(--text-1);}
        .cm-cal-chip{display:flex;align-items:center;gap:4px;font-size:10.5px;padding:2px 4px;border-radius:4px;background:var(--bg-1);border:none;color:var(--text-1);width:100%;cursor:pointer;text-align:left;overflow:hidden;}
        .cm-cal-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .cm-cal-chip .dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
        .cm-cal-more{font-size:10px;color:var(--text-3);padding:0 4px;}
        @media (max-width: 640px) {
          .cm-cal-cell{min-height:50px;}
          .cm-cal-chip span{display:none;}
        }
      `}</style>

      {error && <div className="cm-badge crit" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="cm-section">
        <div className="cm-section-title">Calendario de lanzamientos (compartido con todo el sello)</div>
        <ReleaseCalendar readOnly apiUrl="/api/cm/releases" />
      </div>

      <div className="cm-section-title" style={{ marginBottom: 10 }}>Contenido planificado</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="cm-btn-ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
          <button className="cm-btn-ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
          <button className="cm-btn-ghost" onClick={() => setCursor(new Date())}>Hoy</button>
        </div>
        <button className="cm-btn" onClick={() => setShowNew(toKey(today))}>+ Nueva publicación</button>
      </div>

      {!items ? (
        <p className="cm-empty">Cargando...</p>
      ) : (
        <div className="cm-cal-grid">
          {DIAS.map((d) => <div key={d} className="cm-cal-dayname">{d}</div>)}
          {monthDays.map((d) => {
            const key = toKey(d);
            const dayItems = byDate.get(key) ?? [];
            const outside = d.getMonth() !== cursor.getMonth();
            const visible = dayItems.slice(0, 3);
            const extra = dayItems.length - visible.length;
            return (
              <div
                key={key}
                className={`cm-cal-cell${outside ? " outside" : ""}${isSameDay(d, today) ? " today" : ""}`}
                onDoubleClick={() => setShowNew(key)}
              >
                <div className="cm-cal-daynum">{d.getDate()}</div>
                {visible.map((it) => (
                  <button key={it.id} className="cm-cal-chip" onClick={() => setSelected(it)}>
                    <span className="dot" style={{ background: ESTADO_DOT[it.estado] ?? "var(--text-2)" }} />
                    <span>{it.hora ? `${it.hora} ` : ""}{CM_TIPO_LABELS[it.tipoContenido] ?? it.tipoContenido}</span>
                  </button>
                ))}
                {extra > 0 && <div className="cm-cal-more">+{extra} más</div>}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewContentModal
          accounts={accounts}
          defaultFecha={showNew}
          onClose={() => setShowNew(null)}
          onCreated={() => { setShowNew(null); load(); }}
        />
      )}

      {selected && (
        <ContentDetailModal item={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); load(); }} />
      )}
    </CmShell>
  );
}

function ContentDetailModal({ item, onClose, onChanged }: { item: ContentItem; onClose: () => void; onChanged: () => void }) {
  const [estado, setEstado] = useState(item.estado);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cm/contenidos/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (res.ok) onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("¿Eliminar esta publicación planificada?")) return;
    const res = await fetch(`/api/cm/contenidos/${item.id}`, { method: "DELETE" });
    if (res.ok) onChanged();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="cm-card" onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: "95vw", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{CM_TIPO_LABELS[item.tipoContenido] ?? item.tipoContenido}{item.artistName ? ` — ${item.artistName}` : ""}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{item.fecha.slice(0, 10)}{item.hora ? ` · ${item.hora}` : ""}</div>
        {item.copyText && <div style={{ fontSize: 13 }}>{item.copyText}</div>}
        <div>
          <label className="cm-label">Estado</label>
          <select className="cm-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
            {CM_ESTADOS.map((s) => <option key={s} value={s}>{CM_ESTADO_LABELS[s] ?? s}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
          <button className="cm-btn-ghost" style={{ borderColor: "var(--crit-ink)", color: "var(--crit-ink)" }} onClick={handleDelete}>Eliminar</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="cm-btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="cm-btn" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewContentModal({
  accounts, defaultFecha, onClose, onCreated,
}: { accounts: Account[]; defaultFecha: string; onClose: () => void; onCreated: () => void }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [tipoContenido, setTipoContenido] = useState<string>(CM_TIPOS_CONTENIDO[0]);
  const [fecha, setFecha] = useState(defaultFecha);
  const [hora, setHora] = useState("");
  const [copyText, setCopyText] = useState("");
  const [estado, setEstado] = useState<string>("idea");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  async function handleSave() {
    if (!accountId) { setError("Elegí una cuenta."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cm/contenidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, tipoContenido, fecha, hora: hora || null, copyText: copyText || null, estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="cm-card" onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "95vw", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Nueva publicación</div>
        {accounts.length === 0 ? (
          <p className="cm-empty">No tenés cuentas asignadas todavía.</p>
        ) : (
          <>
            <div>
              <label className="cm-label">Cuenta</label>
              <select className="cm-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Tipo</label>
                <select className="cm-input" value={tipoContenido} onChange={(e) => setTipoContenido(e.target.value)}>
                  {CM_TIPOS_CONTENIDO.map((t) => <option key={t} value={t}>{CM_TIPO_LABELS[t] ?? t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Estado</label>
                <select className="cm-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  {CM_ESTADOS.map((s) => <option key={s} value={s}>{CM_ESTADO_LABELS[s] ?? s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Fecha</label>
                <input type="date" className="cm-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="cm-label">Hora (opcional)</label>
                <input type="time" className="cm-input" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="cm-label">Copy (opcional)</label>
              <textarea className="cm-input" rows={2} value={copyText} onChange={(e) => setCopyText(e.target.value)} style={{ resize: "vertical" }} />
            </div>
          </>
        )}
        {error && <div className="cm-badge crit">{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="cm-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="cm-btn" disabled={saving || accounts.length === 0} onClick={handleSave}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

export default function CmCalendarioPage() {
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <CmCalendarioInner />
    </RequireRole>
  );
}
