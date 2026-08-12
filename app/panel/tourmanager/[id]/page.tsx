"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import RequireRole from "@/app/components/RequireRole";
import { TourManagerShell } from "../_shared";
import HojaForm from "../HojaForm";
import HojaSummary from "../HojaSummary";
import type { HojaDeRuta } from "@/lib/db/tourManager";

// Leaflet touches window/document at import time — must never run during SSR.
const RouteMap = dynamic(() => import("../RouteMap"), { ssr: false });

function HojaDetail({ id }: { id: string }) {
  const router = useRouter();
  const [hoja, setHoja] = useState<HojaDeRuta | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    fetch(`/api/tourmanager/${id}`)
      .then((r) => r.json())
      .then((d: { hoja?: HojaDeRuta }) => setHoja(d.hoja ?? null));
  }
  useEffect(load, [id]);

  async function handleDelete() {
    if (!confirm("¿Borrar esta hoja de ruta?")) return;
    await fetch(`/api/tourmanager/${id}`, { method: "DELETE" });
    router.push("/panel/tourmanager");
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/tourmanager/${id}/pdf`);
      if (!res.ok) throw new Error("No se pudo generar el PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hoja-de-Ruta-${hoja?.artistName ?? id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo generar el PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/tourmanager/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo duplicar.");
      router.push(`/panel/tourmanager/${data.hoja.id}`);
    } catch {
      alert("No se pudo duplicar la hoja de ruta.");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/tourmanager/${id}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el link.");
      setShareUrl(`${window.location.origin}/hoja-de-ruta/${data.token}`);
    } catch {
      alert("No se pudo generar el link para compartir.");
    } finally {
      setSharing(false);
    }
  }

  if (hoja === undefined) {
    return (
      <TourManagerShell backHref="/panel/tourmanager">
        <p style={{ color: "var(--text-3)" }}>Cargando...</p>
      </TourManagerShell>
    );
  }
  if (hoja === null) {
    return (
      <TourManagerShell backHref="/panel/tourmanager">
        <p style={{ color: "var(--text-3)" }}>Hoja de ruta no encontrada.</p>
      </TourManagerShell>
    );
  }

  return (
    <TourManagerShell backHref="/panel/tourmanager" title={hoja.artistName} subtitle="Itinerario y Hospitality">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => setEditing(true)}
          style={{ background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Editar
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 13, cursor: downloadingPdf ? "default" : "pointer", opacity: downloadingPdf ? 0.6 : 1 }}
        >
          {downloadingPdf ? "Generando..." : "Descargar PDF"}
        </button>
        <button
          onClick={handleDuplicate}
          disabled={duplicating}
          style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 13, cursor: duplicating ? "default" : "pointer", opacity: duplicating ? 0.6 : 1 }}
        >
          {duplicating ? "Duplicando..." : "Duplicar"}
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 13, cursor: sharing ? "default" : "pointer", opacity: sharing ? 0.6 : 1 }}
        >
          {sharing ? "Generando..." : "Compartir"}
        </button>
        <button
          onClick={handleDelete}
          style={{ background: "var(--crit-bg)", border: "1px solid transparent", borderRadius: 8, padding: "8px 16px", color: "var(--crit-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Borrar
        </button>
      </div>

      {shareUrl && (
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>Link de solo lectura, sin login:</span>
          <a href={shareUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--accent-color)", wordBreak: "break-all" }}>{shareUrl}</a>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); }}
            style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 6, padding: "4px 10px", color: "var(--text-2)", fontSize: 11.5, cursor: "pointer" }}
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <RouteMap hoja={hoja} />
      </div>

      <HojaSummary hoja={hoja} />

      {editing && (
        <HojaForm
          hoja={hoja}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </TourManagerShell>
  );
}

export default function HojaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["tourmanager"]}>
      <HojaDetail id={id} />
    </RequireRole>
  );
}
