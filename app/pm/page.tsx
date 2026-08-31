"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { PMShell } from "./_shared";

export default function PMLandingPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="¿Qué querés cargar?" homeMaxWidth>
        <div className="pmx-home-buttons" style={{ marginBottom: "1.75rem" }}>
          <Link href="/pm/fonograma" className="pmx-big-btn">
            <h2>Fonograma</h2>
            <p>Cargá un single, EP o álbum nuevo.</p>
          </Link>
          <Link href="/pm/split-editorial" className="pmx-big-btn">
            <h2>Split editorial</h2>
            <p>Cargá quién cobra letra y música de una canción.</p>
          </Link>
          <Link href="/pm/release" className="pmx-big-btn">
            <h2>Release</h2>
            <p>Cargá los datos de derechos de máster de un fonograma.</p>
          </Link>
          <Link href="/pm/artistas" className="pmx-big-btn">
            <h2>Mis Artistas</h2>
            <p>Plan anual, objetivos, historial y reuniones con Management.</p>
          </Link>
        </div>

        <div className="pmx-calendar-row">
          <div>
            <div className="pmx-section-title">Calendario de lanzamientos</div>
            <ReleaseCalendar readOnly apiUrl="/api/pm/releases/dashboard-calendar" />
          </div>
          <div>
            <div className="pmx-section-title">Calendario de estudios de grabación</div>
            <div className="pmx-card" style={{ color: "var(--text-3)", fontSize: 14 }}>
              Próximamente.
            </div>
          </div>
        </div>
      </PMShell>
    </RequireRole>
  );
}
