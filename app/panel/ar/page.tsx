"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import RequirePermission from "@/app/components/RequirePermission";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { AR_CATEGORIES, AR_STATUSES, type ArOpportunity, type ArCategory, type ArStatus } from "@discografica/shared/types/ar";

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
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [scanningCatalog, setScanningCatalog] = useState(false);
  const [scanCatalogMsg, setScanCatalogMsg] = useState<string | null>(null);

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
      if (categoryFilter && o.category !== categoryFilter) return false;
      if (statusFilter && o.status !== statusFilter) return false;
      if (q && !o.title.toLowerCase().includes(q) && !o.subjectName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [opportunities, search, categoryFilter, statusFilter]);

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
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
            {canEdit && (
              <Link href="/panel/ar/nuevo" style={{ ...primaryBtn, textDecoration: "none", display: "inline-block" }}>
                + Cargar hallazgo
              </Link>
            )}
            {canEdit && (
              <Link href="/panel/ar/tendencias" style={{ ...ghostBtn, textDecoration: "none", display: "inline-block" }}>
                Tendencias
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
