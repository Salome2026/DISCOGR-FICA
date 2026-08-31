"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { TourManagerShell } from "../../_shared";
import HojaGenericaForm from "../../HojaGenericaForm";
import type { HojaGenerica } from "@discografica/shared/types/tourManager";

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function HojaGenericaDetail({ id }: { id: string }) {
  const router = useRouter();
  const [hoja, setHoja] = useState<HojaGenerica | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  function load() {
    fetch(`/api/tourmanager/genericas/${id}`)
      .then((r) => r.json())
      .then((d: { hoja?: HojaGenerica }) => setHoja(d.hoja ?? null));
  }
  useEffect(load, [id]);

  async function handleDelete() {
    if (!confirm("¿Borrar esta hoja genérica?")) return;
    await fetch(`/api/tourmanager/genericas/${id}`, { method: "DELETE" });
    router.push("/panel/tourmanager");
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/tourmanager/genericas/${id}/pdf`);
      if (!res.ok) throw new Error("No se pudo generar el PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hoja-Generica-${hoja?.artistName ?? id}.pdf`;
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
        <p style={{ color: "var(--text-3)" }}>Hoja genérica no encontrada.</p>
      </TourManagerShell>
    );
  }

  return (
    <TourManagerShell backHref="/panel/tourmanager" title={hoja.artistName} subtitle={hoja.nombre || "Hoja de ruta genérica"}>
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
          onClick={handleDelete}
          style={{ background: "var(--crit-bg)", border: "1px solid transparent", borderRadius: 8, padding: "8px 16px", color: "var(--crit-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Borrar
        </button>
      </div>

      <div className="tm-card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em" }}>
              <th style={{ padding: "6px 10px" }}>Fecha</th>
              <th style={{ padding: "6px 10px" }}>Hora</th>
              <th style={{ padding: "6px 10px" }}>Búsqueda del artista</th>
              <th style={{ padding: "6px 10px" }}>Venue</th>
              <th style={{ padding: "6px 10px" }}>Recorrido</th>
            </tr>
          </thead>
          <tbody>
            {hoja.shows.map((s, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--line-soft)" }}>
                <td style={{ padding: "8px 10px" }}>{formatFecha(s.fecha)}</td>
                <td style={{ padding: "8px 10px" }}>{s.horaShow ?? "—"}</td>
                <td style={{ padding: "8px 10px" }}>{s.busquedaFullAddress ?? s.busquedaDireccion ?? "—"}</td>
                <td style={{ padding: "8px 10px" }}>{s.venue ?? "—"}<br /><span style={{ color: "var(--text-3)", fontSize: 11.5 }}>{s.venueFullAddress ?? s.venueDireccion ?? ""}</span></td>
                <td style={{ padding: "8px 10px" }}>
                  {s.distanciaKm != null ? `${s.distanciaKm} km · ${s.duracionMin} min` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <HojaGenericaForm
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

export default function HojaGenericaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["tourmanager"]}>
      <HojaGenericaDetail id={id} />
    </RequireRole>
  );
}
