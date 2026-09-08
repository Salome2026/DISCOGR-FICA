"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import RequirePermission from "@/app/components/RequirePermission";
import ModuleWatermark from "@/app/components/ModuleWatermark";
import { hasPermission, type SessionUser } from "@/lib/permissions";

type ArAlert = {
  id: number;
  opportunityId: string | null;
  alertType: string;
  severity: "info" | "warning";
  message: string;
  createdAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  genre_trending: "Género en tendencia",
  artist_exploding: "Artista explotando",
  producer_repeat: "Productor repetido",
  catalog_track_relevant: "Oportunidad de catálogo",
  stalled_artist: "Artista estancado",
};

const ghostBtn: React.CSSProperties = {
  background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 999,
  padding: "8px 14px", color: "var(--text-2)", fontSize: 12.5, cursor: "pointer",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function AlertasInner() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canAck = !!user && hasPermission(user, "editar_ar");

  const [alerts, setAlerts] = useState<ArAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [acking, setAcking] = useState<number | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/ar/alerts${showAll ? "?all=1" : ""}`)
      .then((r) => r.json())
      .then((d: { alerts?: ArAlert[] }) => setAlerts(d.alerts ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, [showAll]);

  async function ack(id: number) {
    setAcking(id);
    try {
      await fetch(`/api/ar/alerts/${id}/ack`, { method: "PATCH" });
      load();
    } finally {
      setAcking(null);
    }
  }

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <ModuleWatermark text="A&R" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Link href="/panel/ar" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>← Volver a A&R</Link>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Alertas</h1>
            <button onClick={() => setShowAll((v) => !v)} style={ghostBtn}>
              {showAll ? "Ver solo pendientes" : "Ver también las vistas"}
            </button>
          </div>
        </div>

        {loading && <div style={{ color: "var(--text-3)", fontSize: 13 }}>Cargando...</div>}
        {!loading && alerts.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: 13.5 }}>
            {showAll ? "Todavía no hubo ninguna alerta." : "No hay alertas pendientes."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map((a) => (
            <div
              key={a.id}
              style={{
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 12,
                padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14,
                opacity: a.acknowledgedAt ? 0.55 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
                      color: a.severity === "warning" ? "var(--warn-ink)" : "var(--text-3)",
                    }}
                  >
                    {ALERT_TYPE_LABELS[a.alertType] ?? a.alertType}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{timeAgo(a.createdAt)}</span>
                </div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{a.message}</div>
                {a.opportunityId && (
                  <Link href={`/panel/ar/${a.opportunityId}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
                    Ver oportunidad →
                  </Link>
                )}
                {a.acknowledgedAt && (
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                    Vista por {a.acknowledgedBy} · {timeAgo(a.acknowledgedAt)}
                  </div>
                )}
              </div>
              {canAck && !a.acknowledgedAt && (
                <button onClick={() => ack(a.id)} disabled={acking === a.id} style={ghostBtn}>
                  {acking === a.id ? "..." : "Marcar como vista"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArAlertasPage() {
  return (
    <RequirePermission need="ver_ar">
      <AlertasInner />
    </RequirePermission>
  );
}
