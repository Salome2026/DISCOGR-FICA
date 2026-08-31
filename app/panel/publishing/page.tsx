"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { PublishingShell } from "./_shared";

// A partir de cuántos splits sin enviar la tarjeta pasa de amarillo a
// rojo — 0 pendientes es verde, entre 1 y este número es amarillo.
const MUCHOS_PENDIENTES = 5;

function PublishingHomeContent() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/publishing/splits")
      .then((r) => r.json())
      .then((d: { splits?: unknown[] }) => setPendingCount(d.splits?.length ?? 0))
      .catch(() => setPendingCount(null));
  }, []);

  const statusClass =
    pendingCount == null
      ? ""
      : pendingCount === 0
        ? "status-ok"
        : pendingCount < MUCHOS_PENDIENTES
          ? "status-warn"
          : "status-crit";

  return (
    <PublishingShell title="TANGO MADE IN ARGENTINA" homeMaxWidth>
      <div className="pub-home-buttons" style={{ marginBottom: "1.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Link href="/panel/publishing/artistas" className="pub-big-btn">
          <h2>Datos de artistas</h2>
          <p>Base de datos de artistas propios y externos con ficha personal completa.</p>
        </Link>
        <Link href="/panel/publishing/splits" className={`pub-big-btn ${statusClass}`}>
          <h2>
            Splits pendientes de envío{pendingCount != null && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </h2>
          <p>Splits que cargaron los Project Managers, listos para revisar y enviar.</p>
        </Link>
        <Link href="/panel/publishing/splits/historico" className="pub-big-btn">
          <h2>Histórico de splits</h2>
          <p>Todos los splits ya enviados, con buscador por canción o artista.</p>
        </Link>
      </div>

      <ReleaseCalendar readOnly apiUrl="/api/pm/releases/dashboard-calendar" />
    </PublishingShell>
  );
}

export default function PublishingHomePage() {
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingHomeContent />
    </RequireRole>
  );
}
