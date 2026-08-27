"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { LegalShell } from "./_shared";
import ReleaseRequestsPending from "./ReleaseRequestsPending";

export default function LegalHomePage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Panel de Legales" homeMaxWidth>
        <div className="legal-home-grid">
          <ReleaseRequestsPending limit={5} />

          <ReleaseCalendar readOnly />

          <div className="legal-home-buttons legal-ficha-buttons">
            <Link href="/panel/legal/contratos" className="legal-big-btn">
              <h2>Contratos de Artistas</h2>
              <p>Base de datos de contratos y documentación legal de cada artista.</p>
            </Link>
            <Link href="/panel/legal/releases" className="legal-big-btn">
              <h2>Releases / Fonogramas</h2>
              <p>Información legal vinculada a cada lanzamiento y fonograma.</p>
            </Link>
            <Link href="/panel/legal/releases-externos" className="legal-big-btn">
              <h2>Releases Externos</h2>
              <p>Lanzamientos de nuestros artistas que salieron por fuera de la plataforma.</p>
            </Link>
          </div>
        </div>
      </LegalShell>
    </RequireRole>
  );
}
