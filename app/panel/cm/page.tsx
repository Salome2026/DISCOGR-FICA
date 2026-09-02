"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CM_TIPO_LABELS, CM_ESTADO_LABELS, CM_MATERIALES_LABELS } from "./_shared";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";

type ContentItem = {
  id: number; accountId: string; artistName: string | null; tipoContenido: string;
  fecha: string; hora: string | null; estado: string;
};
type Account = { id: string; name: string; platform: string };
type Launch = { id: string; artistName: string; fonogramaNombre: string; fechaLanzamiento: string | null; materialesEstado: string; revisadoPorCm: boolean };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function CmHomeInner() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAccountId, setQuickAccountId] = useState("");
  const [quickFecha, setQuickFecha] = useState(todayStr());
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  function refetchItems() {
    fetch(`/api/cm/contenidos?start=${inDays(-7)}&end=${inDays(14)}`).then((r) => r.json()).then((d) => !d.error && setItems(d.items));
  }

  useEffect(() => {
    fetch("/api/cm/cuentas").then((r) => r.json()).then((d) => !d.error && setAccounts(d.accounts));
    refetchItems();
    fetch("/api/cm/lanzamientos").then((r) => r.json()).then((d) => !d.error && setLaunches(d.launches));
  }, []);

  useEffect(() => {
    if (!quickAccountId && accounts.length > 0) setQuickAccountId(accounts[0].id);
  }, [accounts, quickAccountId]);

  async function submitQuickAdd() {
    if (!quickTitle.trim() || !quickAccountId || !quickFecha) {
      setQuickAddError("Completá el título, la cuenta y la fecha.");
      return;
    }
    setSavingQuickAdd(true);
    setQuickAddError(null);
    try {
      const res = await fetch("/api/cm/contenidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: quickAccountId,
          tipoContenido: "recordatorio",
          fecha: quickFecha,
          copyText: quickTitle.trim(),
          estado: "idea",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo agregar el recordatorio.");
      setQuickTitle("");
      setQuickFecha(todayStr());
      setShowQuickAdd(false);
      refetchItems();
    } catch (err) {
      setQuickAddError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSavingQuickAdd(false);
    }
  }

  async function markDone(id: number) {
    setTogglingId(id);
    try {
      await fetch(`/api/cm/contenidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "publicado" }),
      });
      refetchItems();
    } finally {
      setTogglingId(null);
    }
  }

  const today = todayStr();
  const proximos = (items ?? []).filter((i) => i.fecha.slice(0, 10) >= today).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);
  const cumplidas = (items ?? []).filter((i) => i.estado === "publicado").length;
  const atrasadas = (items ?? []).filter((i) => i.fecha.slice(0, 10) < today && !["publicado", "cancelado"].includes(i.estado)).length;
  const pendientes = (items ?? []).filter((i) => i.fecha.slice(0, 10) >= today && !["publicado", "cancelado"].includes(i.estado)).length;
  const tareasAbiertas = (items ?? [])
    .filter((i) => !["publicado", "cancelado"].includes(i.estado))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const lanzamientosSinContenido = launches.filter((l) => {
    const fecha = l.fechaLanzamiento?.slice(0, 10);
    if (!fecha) return false;
    const diff = (new Date(fecha).getTime() - new Date(today).getTime()) / 86400000;
    return diff >= 0 && diff <= 7 && !(items ?? []).some((i) => i.artistName === l.artistName);
  });

  return (
    <CmShell title="Community Manager" subtitle="Portada del día" active="home">
      <div className="cm-section">
        <div className="cm-section-title">Calendario de lanzamientos (compartido con todo el sello)</div>
        <ReleaseCalendar readOnly apiUrl="/api/cm/releases" />
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Publicaciones de hoy y próximos días</div>
        {items === null ? (
          <p className="cm-empty">Cargando...</p>
        ) : proximos.length === 0 ? (
          <p className="cm-empty">Sin publicaciones planificadas en los próximos días.</p>
        ) : (
          <div className="cm-grid">
            {proximos.map((i) => (
              <div key={i.id} className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{CM_TIPO_LABELS[i.tipoContenido] ?? i.tipoContenido}{i.artistName ? ` — ${i.artistName}` : ""}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{i.fecha.slice(0, 10)}{i.hora ? ` · ${i.hora}` : ""}</div>
                <span className="cm-badge">{CM_ESTADO_LABELS[i.estado] ?? i.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div className="cm-section-title" style={{ marginBottom: 0 }}>Tareas</div>
          <button type="button" className="cm-btn" onClick={() => setShowQuickAdd((v) => !v)}>
            + Agregar recordatorio
          </button>
        </div>

        {showQuickAdd && (
          <div className="cm-card" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="cm-label">Título</label>
              <input
                className="cm-input"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Ej: Subir historia de anuncio de fecha"
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label className="cm-label">Cuenta</label>
                <select className="cm-input" value={quickAccountId} onChange={(e) => setQuickAccountId(e.target.value)}>
                  {accounts.length === 0 && <option value="">Sin cuentas asignadas</option>}
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <label className="cm-label">Fecha</label>
                <input type="date" className="cm-input" value={quickFecha} onChange={(e) => setQuickFecha(e.target.value)} />
              </div>
            </div>
            {quickAddError && <div className="cm-badge crit">{quickAddError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="cm-btn-ghost" onClick={() => setShowQuickAdd(false)}>Cancelar</button>
              <button type="button" className="cm-btn" onClick={submitQuickAdd} disabled={savingQuickAdd}>
                {savingQuickAdd ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <div className="cm-card" style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{cumplidas}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Cumplidas</div>
          </div>
          <div className="cm-card" style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: atrasadas > 0 ? "var(--crit-ink)" : undefined }}>{atrasadas}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Atrasadas</div>
          </div>
          <div className="cm-card" style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{pendientes}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>Pendientes</div>
          </div>
        </div>

        {tareasAbiertas.length === 0 ? (
          <p className="cm-empty">No tenés tareas abiertas.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tareasAbiertas.map((i) => {
              const isLate = i.fecha.slice(0, 10) < today;
              return (
                <label
                  key={i.id}
                  className="cm-card"
                  style={{ display: "flex", alignItems: "center", gap: 12, cursor: togglingId === i.id ? "default" : "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={togglingId === i.id}
                    onChange={() => markDone(i.id)}
                    style={{ width: 18, height: 18, flexShrink: 0, cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {CM_TIPO_LABELS[i.tipoContenido] ?? i.tipoContenido}{i.artistName ? ` — ${i.artistName}` : ""}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: isLate ? "var(--crit-ink)" : "var(--text-2)" }}>
                      {i.fecha.slice(0, 10)}{i.hora ? ` · ${i.hora}` : ""}{isLate ? " · Atrasada" : ""}
                    </div>
                  </div>
                  <span className="cm-badge">{CM_ESTADO_LABELS[i.estado] ?? i.estado}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Cuentas asignadas</div>
        {accounts.length === 0 ? (
          <p className="cm-empty">Todavía no tenés cuentas asignadas.</p>
        ) : (
          <div className="cm-grid">
            {accounts.map((a) => (
              <Link key={a.id} href={`/panel/cm/cuentas/${a.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{a.platform}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Alertas — lanzamientos sin contenido programado (próximos 7 días)</div>
        {lanzamientosSinContenido.length === 0 ? (
          <p className="cm-empty">Sin alertas.</p>
        ) : (
          <div className="cm-grid">
            {lanzamientosSinContenido.map((l) => (
              <Link key={l.id} href={`/panel/cm/lanzamientos/${l.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{l.fonogramaNombre}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{l.artistName} · {l.fechaLanzamiento?.slice(0, 10)}</div>
                <span className="cm-badge warn">{CM_MATERIALES_LABELS[l.materialesEstado] ?? l.materialesEstado}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CmShell>
  );
}

export default function CmHomePage() {
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <CmHomeInner />
    </RequireRole>
  );
}
