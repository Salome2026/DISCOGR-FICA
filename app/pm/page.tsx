"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import StudioCalendar from "@/app/components/StudioCalendar";
import { PMShell } from "./_shared";

export default function PMLandingPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="¿Qué querés cargar?" homeMaxWidth>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <Link href="/pm/reuniones" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            Reuniones de Management →
          </Link>
        </div>
        <div className="pmx-home-buttons" style={{ marginBottom: "1.75rem" }}>
          <Link href="/pm/artistas" className="pmx-big-btn">
            <h2>Mis Artistas</h2>
            <p>Plan anual, objetivos, historial y reuniones con Management.</p>
          </Link>
          <Link href="/pm/fonograma" className="pmx-big-btn">
            <h2>Fonograma</h2>
            <p>Cargá un single, EP o álbum nuevo.</p>
          </Link>
          <Link href="/pm/split-editorial" className="pmx-big-btn">
            <h2>Split editorial</h2>
            <p>Cargá la división de % de autoría y composición de la obra.</p>
          </Link>
          <Link href="/pm/release" className="pmx-big-btn">
            <h2>Release</h2>
            <p>Cargá los datos de derechos de máster de un fonograma.</p>
          </Link>
        </div>

        <div className="pmx-calendar-row">
          <div>
            <div className="pmx-section-title">Calendario de lanzamientos</div>
            <ReleaseCalendar readOnly apiUrl="/api/pm/releases/dashboard-calendar" />
          </div>
          <div>
            <div className="pmx-section-title">Calendario de estudios de grabación</div>
            <StudioCalendar mode="pm" />
          </div>
        </div>
      </PMShell>
    </RequireRole>
  );
}
