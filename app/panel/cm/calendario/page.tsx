"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CM_TIPO_LABELS, CM_ESTADO_LABELS } from "../_shared";
import { CM_TIPOS_CONTENIDO, CM_ESTADOS } from "@/lib/db/cmContent";

type ContentItem = {
  id: number; accountId: string; artistName: string | null; tipoContenido: string;
  fecha: string; hora: string | null; estado: string; copyText: string | null;
};
type Account = { id: string; name: string };

function monthRange(d: Date): { start: string; end: string; label: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) };
}

function CmCalendarioInner() {
  const [cursor, setCursor] = useState(new Date());
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { start, end, label } = monthRange(cursor);

  function load() {
    fetch(`/api/cm/contenidos?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setItems(d.items)));
  }
  useEffect(load, [start, end]);
  useEffect(() => {
    fetch("/api/cm/cuentas").then((r) => r.json()).then((d) => !d.error && setAccounts(d.accounts));
  }, []);

  const byDate: Record<string, ContentItem[]> = {};
  for (const it of items ?? []) {
    (byDate[it.fecha.slice(0, 10)] ??= []).push(it);
  }
  const days = Object.keys(byDate).sort();

  return (
    <CmShell title="Calendario de contenidos" subtitle="Lanzamientos y publicaciones planificadas" active="calendario">
      {error && <div className="cm-badge crit" style={{ marginBottom: 16 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="cm-btn-ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
          <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{label}</div>
          <button className="cm-btn-ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
        </div>
        <button className="cm-btn" onClick={() => setShowNew(true)}>+ Nueva publicación</button>
      </div>

      {!items ? (
        <p style={{ color: "var(--text-3)" }}>Cargando...</p>
      ) : days.length === 0 ? (
        <p style={{ color: "var(--text-3)" }}>Sin contenido planificado este mes.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {days.map((d) => (
            <div key={d} className="cm-card">
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{d}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {byDate[d].map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, borderTop: "1px solid var(--line-soft)", paddingTop: 6 }}>
                    <span>{it.hora ? `${it.hora} · ` : ""}{CM_TIPO_LABELS[it.tipoContenido] ?? it.tipoContenido}{it.artistName ? ` — ${it.artistName}` : ""}</span>
                    <span className="cm-badge">{CM_ESTADO_LABELS[it.estado] ?? it.estado}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewContentModal
          accounts={accounts}
          defaultFecha={start}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </CmShell>
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
        {error && <div className="cm-badge crit">{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="cm-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="cm-btn" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : "Guardar"}</button>
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
