"use client";

import RequireRole from "@/app/components/RequireRole";
import { PublishingShell } from "../_shared";

export default function PublishingSplitsPage() {
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingShell title="% de Split Editorial" subtitle="Próximamente" backHref="/panel/publishing">
        <div className="pub-card">
          <p className="muted">Esta sección está en construcción. Pronto vas a poder cargar y consultar los porcentajes de split editorial de cada fonograma.</p>
        </div>
      </PublishingShell>
    </RequireRole>
  );
}
