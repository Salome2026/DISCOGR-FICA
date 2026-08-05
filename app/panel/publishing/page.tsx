"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { PublishingShell } from "./_shared";

export default function PublishingHomePage() {
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingShell title="TANGO MADE IN ARGENTINA" homeMaxWidth>
        <div className="pub-home-buttons" style={{ marginBottom: "1.75rem" }}>
          <Link href="/panel/publishing/artistas" className="pub-big-btn">
            <h2>Datos de artistas</h2>
            <p>Base de datos de artistas propios y externos con ficha personal completa.</p>
          </Link>
          <Link href="/panel/publishing/splits" className="pub-big-btn">
            <h2>% de split editorial</h2>
            <p>Carga y consulta de porcentajes editoriales por fonograma.</p>
          </Link>
        </div>

        <ReleaseCalendar readOnly />
      </PublishingShell>
    </RequireRole>
  );
}
