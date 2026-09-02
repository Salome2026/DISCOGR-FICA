"use client";

import RequireRole from "@/app/components/RequireRole";
import { CmShell } from "../_shared";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import ContentCalendar from "../ContentCalendar";

function CmCalendarioInner() {
  return (
    <CmShell title="Calendario" subtitle="Lanzamientos y publicaciones planificadas" active="calendario">
      <div className="cm-section">
        <div className="cm-section-title">Calendario de lanzamientos (compartido con todo el sello)</div>
        <ReleaseCalendar readOnly apiUrl="/api/cm/releases" />
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Calendario de contenidos</div>
        <ContentCalendar />
      </div>
    </CmShell>
  );
}

export default function CmCalendarioPage() {
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <CmCalendarioInner />
    </RequireRole>
  );
}
