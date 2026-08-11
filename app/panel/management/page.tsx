"use client";

import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { ManagementShell } from "./_shared";
import ArtistGrid from "./ArtistGrid";
import UpcomingReleasesList from "./UpcomingReleasesList";

export default function ManagementHomePage() {
  return (
    <RequireRole allow={["management"]}>
      <ManagementShell title="Management">
        <ArtistGrid />
        <div className="mgmt-section">
          <div className="mgmt-section-label">Calendario de lanzamientos</div>
          <ReleaseCalendar readOnly apiUrl="/api/management/releases" className="mgmt-calendar-wide" />
        </div>
        <UpcomingReleasesList />
      </ManagementShell>
    </RequireRole>
  );
}
