"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import RequirePermission from "@/app/components/RequirePermission";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import type { ArGenreTrendSignal, ArGenreTrendDirection } from "@discografica/shared/types/ar";

const DIRECTIONS: { value: ArGenreTrendDirection; label: string }[] = [
  { value: "growing", label: "En crecimiento" },
  { value: "declining", label: "En caída" },
  { value: "stable", label: "Estable" },
];

function directionColor(d: ArGenreTrendDirection): string {
  if (d === "growing") return "var(--good-ink)";
  if (d === "declining") return "var(--crit-ink)";
  return "var(--text-3)";
}

function ArTendenciasContent() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_ar");

  const [signals, setSignals] = useState<ArGenreTrendSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [genre, setGenre] = useState("");
  const [trendDirection, setTrendDirection] = useState<ArGenreTrendDirection>("growing");
  const [sourceType, setSourceType] = useState("manual_tiktok");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/ar/trends")
      .then((r) => r.json())
      .then((d: { signals?: ArGenreTrendSignal[]; error?: string }) => {
        if (d.error) throw new Error(d.error);
        setSignals(d.signals ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las tendencias."))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!genre.trim()) {
      setError("Falta indicar el género.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ar/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: genre.trim(), trendDirection, sourceType, note: note.trim() || null, evidenceUrl: evidenceUrl.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      setGenre("");
      setNote("");
      setEvidenceUrl("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(signal: ArGenreTrendSignal) {
    await fetch(`/api/ar/trends/${signal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !signal.active }),
    });
    load();
  }

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <Link href="/panel/ar" style={{ color: "var(--text-3)", fontSize: 13, textDecoration: "none" }}>&larr; Volver</Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Tendencias de género</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Reportá acá lo que veas moverse en TikTok, Instagram u otras fuentes sin API disponible —
            el escaneo de revival de catálogo usa las tendencias marcadas &quot;En crecimiento&quot; para
            revisar qué fonogramas propios podrían relanzarse.
          </p>
        </div>

        {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "10px 14px", borderRadius: 10, fontSize: 13 }}>{error}</div>}

        {canEdit && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Reportar tendencia</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Género (ej: Cumbia)" style={{ ...inputStyle, flex: "1 1 180px" }} />
              <select value={trendDirection} onChange={(e) => setTrendDirection(e.target.value as ArGenreTrendDirection)} style={inputStyle}>
                {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} style={inputStyle}>
                <option value="manual_tiktok">TikTok</option>
                <option value="manual_other">Otra red social</option>
                <option value="internal_playlist_signal">Playlists propias</option>
              </select>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" style={inputStyle} />
            <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Link de evidencia (opcional)" style={inputStyle} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Guardando..." : "Reportar"}</button>
            </div>
          </form>
        )}

        {!loading && signals.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: 13, padding: "2rem 0", textAlign: "center" }}>
            Todavía no hay tendencias reportadas.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {signals.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "10px 14px", opacity: s.active ? 1 : 0.5 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {s.genre} <span style={{ fontSize: 12, fontWeight: 600, color: directionColor(s.trendDirection) }}>· {DIRECTIONS.find((d) => d.value === s.trendDirection)?.label}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                  {s.sourceType} · {new Date(s.reportedAt).toLocaleDateString("es-AR")}{s.note ? ` · ${s.note}` : ""}
                </div>
              </div>
              {canEdit && (
                <button type="button" onClick={() => toggleActive(s)} style={ghostBtn}>
                  {s.active ? "Desactivar" : "Reactivar"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "var(--text-1)",
  fontSize: 13.5,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "7px 14px",
  color: "var(--text-2)",
  fontSize: 12,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "var(--accent-glass-bg)",
  border: "1px solid var(--accent-glass-border)",
  borderRadius: 8,
  padding: "9px 18px",
  color: "var(--text-1)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

export default function ArTendenciasPage() {
  return (
    <RequirePermission need="ver_ar">
      <ArTendenciasContent />
    </RequirePermission>
  );
}
