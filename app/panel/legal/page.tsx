"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { LegalShell } from "./_shared";

export default function LegalHomePage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Panel de Legales" homeMaxWidth>
        <div className="legal-home-grid">
          <ReleaseCalendar readOnly />

          <div className="legal-home-buttons">
            <Link href="/panel/legal/contratos" className="legal-big-btn">
              <span className="icon">📄</span>
              <h2>Contratos de Artistas</h2>
              <p>Base de datos de contratos y documentación legal de cada artista.</p>
            </Link>
            <Link href="/panel/legal/releases" className="legal-big-btn">
              <span className="icon">🎵</span>
              <h2>Releases / Fonogramas</h2>
              <p>Información legal vinculada a cada lanzamiento y fonograma.</p>
            </Link>
          </div>
        </div>
      </LegalShell>
    </RequireRole>
  );
}
