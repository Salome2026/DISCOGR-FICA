"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RequirePermission from "@/app/components/RequirePermission";
import { SELLOS } from "@discografica/shared/sellos";
import { AR_CATEGORIES, AR_SUBJECT_TYPES, type ArCategory, type ArSubjectType, type ArOpportunityInput } from "@discografica/shared/types/ar";

const SUBJECT_TYPE_LABELS: Record<ArSubjectType, string> = {
  artist_external: "Artista (externo)",
  artist_label: "Artista propio",
  track_external: "Canción (externa)",
  track_label: "Canción propia",
  sound_tiktok: "Audio de TikTok",
  trend_general: "Tendencia general",
};

function ArNuevoContent() {
  const router = useRouter();
  const [category, setCategory] = useState<ArCategory>("NUEVO TALENTO");
  const [title, setTitle] = useState("");
  const [subjectType, setSubjectType] = useState<ArSubjectType>("sound_tiktok");
  const [subjectName, setSubjectName] = useState("");
  const [regionFocus, setRegionFocus] = useState<"AR" | "foreign_relevant_to_ar">("AR");
  const [suggestedSello, setSuggestedSello] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [dataUnavailableNote, setDataUnavailableNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !subjectName.trim() || !sourceLabel.trim()) {
      setError("Título, sujeto y una fuente (con etiqueta) son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const input: ArOpportunityInput = {
        category,
        title: title.trim(),
        subjectType,
        subjectName: subjectName.trim(),
        regionFocus,
        suggestedSello: suggestedSello || null,
        sources: [{ type: "manual", label: sourceLabel.trim(), url: sourceUrl.trim() || null, asOf: new Date().toISOString(), note: sourceNote.trim() || null }],
        dataUnavailableNote: dataUnavailableNote.trim() || null,
      };
      const res = await fetch("/api/ar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      router.push(`/panel/ar/${data.opportunity.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href="/panel/ar" style={{ color: "var(--text-3)", fontSize: 13, textDecoration: "none" }}>&larr; Volver</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Cargar hallazgo</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
          Para observaciones manuales — por ejemplo, algo visto en TikTok Creative Center, que no tiene una API disponible para traer automáticamente.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Categoría">
            <select value={category} onChange={(e) => setCategory(e.target.value as ArCategory)} style={inputStyle}>
              {AR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Título">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resumen en una línea" style={inputStyle} />
          </Field>
          <Field label="Tipo de sujeto">
            <select value={subjectType} onChange={(e) => setSubjectType(e.target.value as ArSubjectType)} style={inputStyle}>
              {AR_SUBJECT_TYPES.map((t) => <option key={t} value={t}>{SUBJECT_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <Field label="Nombre del artista / canción / audio">
            <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Foco regional">
            <select value={regionFocus} onChange={(e) => setRegionFocus(e.target.value as "AR" | "foreign_relevant_to_ar")} style={inputStyle}>
              <option value="AR">Argentina</option>
              <option value="foreign_relevant_to_ar">Exterior con impacto en Argentina</option>
            </select>
          </Field>
          <Field label="Sello sugerido (opcional)">
            <select value={suggestedSello} onChange={(e) => setSuggestedSello(e.target.value)} style={inputStyle}>
              <option value="">Sin sugerir</option>
              {SELLOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12, fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)" }}>
            Fuente (obligatoria)
          </div>
          <Field label="Dónde lo viste">
            <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="Ej: TikTok Creative Center, 18/08/2026" style={inputStyle} />
          </Field>
          <Field label="Link (opcional)">
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Nota (opcional)">
            <input value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Qué no se pudo confirmar todavía (opcional)">
            <textarea value={dataUnavailableNote} onChange={(e) => setDataUnavailableNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>

          {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "10px 14px", borderRadius: 10, fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Link href="/panel/ar" style={{ ...ghostBtn, textDecoration: "none" }}>Cancelar</Link>
            <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--text-2)" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "var(--text-1)",
  fontSize: 14,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "9px 18px",
  color: "var(--text-2)",
  fontSize: 13,
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

export default function ArNuevoPage() {
  return (
    <RequirePermission need="editar_ar">
      <ArNuevoContent />
    </RequirePermission>
  );
}
