"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { PublishingShell } from "./_shared";

export default function PublishingHomePage() {
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingShell title="TANGO MADE IN ARGENTINA" homeMaxWidth>
        <div className="pub-home-buttons" style={{ marginBottom: "1.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Link href="/panel/publishing/artistas" className="pub-big-btn">
            <h2>Datos de artistas</h2>
            <p>Base de datos de artistas propios y externos con ficha personal completa.</p>
          </Link>
          <Link href="/panel/publishing/splits" className="pub-big-btn">
            <h2>Splits pendientes de envío</h2>
            <p>Splits que cargaron los Project Managers, listos para revisar y enviar.</p>
          </Link>
          <Link href="/panel/publishing/splits/historico" className="pub-big-btn">
            <h2>Histórico de splits</h2>
            <p>Todos los splits ya enviados, con buscador por canción o artista.</p>
          </Link>
        </div>

        <ReleaseCalendar readOnly apiUrl="/api/pm/releases/dashboard-calendar" />
      </PublishingShell>
    </RequireRole>
  );
}
