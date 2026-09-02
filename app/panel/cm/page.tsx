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

  useEffect(() => {
    fetch("/api/cm/cuentas").then((r) => r.json()).then((d) => !d.error && setAccounts(d.accounts));
    fetch(`/api/cm/contenidos?start=${inDays(-7)}&end=${inDays(14)}`).then((r) => r.json()).then((d) => !d.error && setItems(d.items));
    fetch("/api/cm/lanzamientos").then((r) => r.json()).then((d) => !d.error && setLaunches(d.launches));
  }, []);

  const today = todayStr();
  const proximos = (items ?? []).filter((i) => i.fecha.slice(0, 10) >= today).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);
  const cumplidas = (items ?? []).filter((i) => i.estado === "publicado").length;
  const atrasadas = (items ?? []).filter((i) => i.fecha.slice(0, 10) < today && !["publicado", "cancelado"].includes(i.estado)).length;
  const pendientes = (items ?? []).filter((i) => i.fecha.slice(0, 10) >= today && !["publicado", "cancelado"].includes(i.estado)).length;
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
          <p style={{ color: "var(--text-3)" }}>Cargando...</p>
        ) : proximos.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin publicaciones planificadas en los próximos días.</p>
        ) : (
          <div className="cm-grid">
            {proximos.map((i) => (
              <div key={i.id} className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{CM_TIPO_LABELS[i.tipoContenido] ?? i.tipoContenido}{i.artistName ? ` — ${i.artistName}` : ""}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{i.fecha.slice(0, 10)}{i.hora ? ` · ${i.hora}` : ""}</div>
                <span className="cm-badge">{CM_ESTADO_LABELS[i.estado] ?? i.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Tareas</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="cm-card" style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{cumplidas}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Cumplidas</div>
          </div>
          <div className="cm-card" style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: atrasadas > 0 ? "var(--crit-ink)" : undefined }}>{atrasadas}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Atrasadas</div>
          </div>
          <div className="cm-card" style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{pendientes}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Pendientes</div>
          </div>
        </div>
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Cuentas asignadas</div>
        {accounts.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>Todavía no tenés cuentas asignadas.</p>
        ) : (
          <div className="cm-grid">
            {accounts.map((a) => (
              <Link key={a.id} href={`/panel/cm/cuentas/${a.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{a.platform}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Alertas — lanzamientos sin contenido programado (próximos 7 días)</div>
        {lanzamientosSinContenido.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin alertas.</p>
        ) : (
          <div className="cm-grid">
            {lanzamientosSinContenido.map((l) => (
              <Link key={l.id} href={`/panel/cm/lanzamientos/${l.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.fonogramaNombre}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{l.artistName} · {l.fechaLanzamiento?.slice(0, 10)}</div>
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
