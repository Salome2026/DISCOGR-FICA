"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import RequirePermission from "@/app/components/RequirePermission";
import ModuleWatermark from "@/app/components/ModuleWatermark";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { AR_CATEGORIES, AR_STATUSES, type ArOpportunity, type ArCategory, type ArStatus, type ArMarketSnapshot } from "@discografica/shared/types/ar";

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

function MarketSnapshotCard({ canEdit }: { canEdit: boolean }) {
  const [snapshot, setSnapshot] = useState<ArMarketSnapshot | null | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ArMarketSnapshot[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  function load() {
    fetch("/api/ar/market-snapshot")
      .then((r) => r.json())
      .then((d: { snapshot?: ArMarketSnapshot | null }) => setSnapshot(d.snapshot ?? null));
  }
  useEffect(load, []);

  async function fetchHistory() {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/ar/market-snapshot/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el historial.");
      setHistory(data.snapshots ?? []);
    } catch (err) {
      setHistory(null);
      setHistoryError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history === null && !loadingHistory) {
      await fetchHistory();
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ar/market-snapshot", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el resumen.");
      setSnapshot(data.snapshot);
      // A new current snapshot pushes the previous one into history — the
      // cached list (if the panel is open) would otherwise miss it.
      if (showHistory) {
        fetchHistory();
      } else {
        setHistory(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setGenerating(false);
    }
  }

  if (snapshot === undefined) return null;

  return (
    <div
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
          Resumen de mercado{snapshot ? ` · ${timeAgo(snapshot.generatedAt)}` : ""}
        </div>
        {canEdit && (
          <button type="button" onClick={handleGenerate} disabled={generating} style={ghostBtn}>
            {generating ? "Generando..." : snapshot ? "↻ Actualizar ahora" : "✦ Generar ahora"}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 12.5, color: "var(--crit-ink)" }}>{error}</div>}
      {!snapshot ? (
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>
          Todavía no se generó ningún resumen. {canEdit ? "Generalo con el botón de arriba, o esperá a la corrida diaria automática." : "Esperá a que el equipo de A&R lo genere."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{snapshot.narrative.resumenGeneral}</div>
          {snapshot.narrative.hallazgosClave.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {snapshot.narrative.hallazgosClave.map((h, i) => (
                <div key={i} style={{ fontSize: 13 }}>
                  <strong>{h.titulo}</strong> — {h.detalle}
                </div>
              ))}
            </div>
          )}
          {snapshot.narrative.generosEnCrecimientoAR.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {snapshot.narrative.generosEnCrecimientoAR.map((g) => (
                <span key={g} style={pill}>{g}</span>
              ))}
            </div>
          )}
          {(snapshot.narrative.artistasRosterDestacados?.length ?? 0) > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={sectionLabel}>Artistas del roster destacados</div>
              {snapshot.narrative.artistasRosterDestacados.map((a, i) => (
                <div key={i} style={{ fontSize: 13 }}>
                  <strong>{a.nombre}</strong> — {a.motivo}
                </div>
              ))}
            </div>
          )}
          {(snapshot.narrative.oportunidadesParaRevisar?.length ?? 0) > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={sectionLabel}>Oportunidades para revisar</div>
              {snapshot.narrative.oportunidadesParaRevisar.map((o, i) => (
                <Link
                  key={i}
                  href={`/panel/ar/${o.opportunityId}`}
                  style={{ fontSize: 13, color: "var(--text-1)", textDecoration: "none" }}
                >
                  → {o.motivo}
                </Link>
              ))}
            </div>
          )}
          <div>
            <button type="button" onClick={toggleHistory} style={{ ...ghostBtn, fontSize: 11.5, padding: "5px 10px" }}>
              {showHistory ? "Ocultar resúmenes anteriores" : "Ver resúmenes anteriores"}
            </button>
          </div>
          {showHistory && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--glass-border)", paddingTop: 8 }}>
              {(() => {
                if (loadingHistory) {
                  return <div style={{ fontSize: 12, color: "var(--text-3)" }}>Cargando...</div>;
                }
                if (historyError) {
                  return (
                    <div style={{ fontSize: 12, color: "var(--crit-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                      {historyError}
                      <button type="button" onClick={fetchHistory} style={{ ...ghostBtn, fontSize: 11, padding: "3px 8px" }}>
                        Reintentar
                      </button>
                    </div>
                  );
                }
                const previous = (history ?? []).filter((h) => h.id !== snapshot.id);
                if (previous.length === 0) {
                  return <div style={{ fontSize: 12, color: "var(--text-3)" }}>No hay resúmenes anteriores todavía.</div>;
                }
                return previous.map((h) => (
                  <div key={h.id} style={{ fontSize: 12.5 }}>
                    <div style={{ color: "var(--text-3)", fontSize: 11 }}>{timeAgo(h.generatedAt)}</div>
                    <div>{h.narrative.resumenGeneral}</div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number | null): string {
  if (score == null) return "var(--text-3)";
  if (score >= 60) return "var(--good-ink)";
  if (score >= 35) return "var(--warn-ink)";
  return "var(--crit-ink)";
}

function ArContent() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_ar");

  const [opportunities, setOpportunities] = useState<ArOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ArCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<ArStatus | "">("");
  const [onlyScouting, setOnlyScouting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [scanningCatalog, setScanningCatalog] = useState(false);
  const [scanCatalogMsg, setScanCatalogMsg] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetch("/api/ar/alerts")
      .then((r) => r.json())
      .then((d: { alerts?: unknown[] }) => setAlertCount(d.alerts?.length ?? 0))
      .catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/ar")
      .then((r) => r.json())
      .then((d: { opportunities?: ArOpportunity[]; error?: string }) => {
        if (d.error) throw new Error(d.error);
        setOpportunities(d.opportunities ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las oportunidades."))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await fetch("/api/ar/scan-roster", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo escanear.");
      setScanMsg(`Revisados ${data.scanned} artistas — ${data.created} nuevas, ${data.updated} actualizadas.`);
      load();
    } catch (err) {
      setScanMsg(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setScanning(false);
    }
  }

  async function handleScanCatalog() {
    setScanningCatalog(true);
    setScanCatalogMsg(null);
    try {
      const res = await fetch("/api/ar/scan-catalog-revival", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo escanear.");
      setScanCatalogMsg(`Revisadas ${data.scanned} canciones propias — ${data.created} nuevas, ${data.updated} actualizadas.`);
      load();
    } catch (err) {
      setScanCatalogMsg(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setScanningCatalog(false);
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (onlyScouting && o.subjectType !== "artist_external") return false;
      if (categoryFilter && o.category !== categoryFilter) return false;
      if (statusFilter && o.status !== statusFilter) return false;
      if (q && !o.title.toLowerCase().includes(q) && !o.subjectName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [opportunities, search, categoryFilter, statusFilter, onlyScouting]);

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <ModuleWatermark text="A&R" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-.03em",
                margin: 0,
                background: "linear-gradient(180deg,var(--text-1) 30%,var(--text-2) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              A&amp;R
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 5 }}>
              {opportunities.length} oportunidad{opportunities.length === 1 ? "" : "es"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/ar/alertas" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Alertas
              {alertCount > 0 && (
                <span style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>
                  {alertCount}
                </span>
              )}
            </Link>
            {canEdit && (
              <Link href="/panel/ar/nuevo" style={{ ...primaryBtn, textDecoration: "none", display: "inline-block" }}>
                + Cargar hallazgo
              </Link>
            )}
            <Link href="/panel/ar/artistas" style={{ ...ghostBtn, textDecoration: "none", display: "inline-block" }}>
              Análisis por artista
            </Link>
            {canEdit && (
              <Link href="/panel/ar/tendencias" style={{ ...ghostBtn, textDecoration: "none", display: "inline-block" }}>
                Tendencias
              </Link>
            )}
            {canEdit && (
              <Link href="/panel/ar/configuracion" style={{ ...ghostBtn, textDecoration: "none", display: "inline-block" }}>
                Configurar agente
              </Link>
            )}
            {canEdit && (
              <button type="button" onClick={handleScan} style={ghostBtn} disabled={scanning}>
                {scanning ? "Escaneando..." : "Escanear roster propio"}
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={handleScanCatalog} style={ghostBtn} disabled={scanningCatalog}>
                {scanningCatalog ? "Escaneando..." : "Escanear catálogo (tendencias)"}
              </button>
            )}
            <button type="button" onClick={load} style={ghostBtn} disabled={loading}>
              {loading ? "Actualizando..." : "↻ Actualizar"}
            </button>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} style={ghostBtn}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <MarketSnapshotCard canEdit={canEdit} />

        {scanMsg && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{scanMsg}</div>}
        {scanCatalogMsg && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{scanCatalogMsg}</div>}
        {error && <div style={banner}>{error}</div>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por artista o título..."
            style={{ ...inputStyle, flex: "1 1 220px" }}
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as ArCategory | "")} style={inputStyle}>
            <option value="">Todas las categorías</option>
            {AR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ArStatus | "")} style={inputStyle}>
            <option value="">Todos los estados</option>
            {AR_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOnlyScouting((v) => !v)}
            style={onlyScouting ? primaryBtn : ghostBtn}
          >
            Scouting
          </button>
        </div>

        {!loading && visible.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: 13, padding: "2rem 0", textAlign: "center" }}>
            No hay oportunidades para mostrar.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {visible.map((o) => {
            const isCatalog = o.category === "OPORTUNIDAD DE CATÁLOGO";
            return (
            <Link
              key={o.id}
              href={`/panel/ar/${o.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: isCatalog ? "var(--accent-glass-bg)" : "var(--glass-bg)",
                border: isCatalog ? "1px solid var(--accent-glass-border)" : "1px solid var(--glass-border)",
                borderRadius: 14,
                padding: 14,
                textDecoration: "none",
                color: "var(--text-1)",
                backdropFilter: "blur(var(--glass-blur)) saturate(1.7)",
                WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(1.7)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <span style={pill}>{isCatalog ? "♻ CATÁLOGO" : o.category}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(o.opportunityScore) }}>
                  {o.opportunityScore != null ? `${o.opportunityScore}/100` : "—"}
                </span>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3 }}>{o.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{o.subjectName}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between" }}>
                <span>{o.status}</span>
                <span>{o.regionFocus === "AR" ? "Argentina" : "Exterior → AR"}</span>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-1)",
  fontSize: 13,
};

const ghostBtn: React.CSSProperties = {
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: 999,
  padding: "8px 14px",
  color: "var(--text-2)",
  fontSize: 12.5,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "var(--accent-glass-bg)",
  border: "1px solid var(--accent-glass-border)",
  borderRadius: 10,
  padding: "8px 16px",
  color: "var(--text-1)",
  fontWeight: 600,
  fontSize: 12.5,
  cursor: "pointer",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: ".03em",
};

const pill: React.CSSProperties = {
  fontSize: 10,
  padding: "3px 8px",
  borderRadius: 999,
  background: "var(--accent-glass-bg)",
  border: "1px solid var(--accent-glass-border)",
  color: "var(--text-2)",
};

const banner: React.CSSProperties = {
  background: "var(--crit-bg)",
  color: "var(--crit-ink)",
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 13,
};

export default function ArPage() {
  return (
    <RequirePermission need="ver_ar">
      <ArContent />
    </RequirePermission>
  );
}
