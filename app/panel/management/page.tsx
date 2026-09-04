"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import ManagementMeetingsCalendar from "@/app/components/ManagementMeetingsCalendar";
import { ManagementShell } from "./_shared";
import ArtistGrid from "./ArtistGrid";
import UpcomingReleasesList from "./UpcomingReleasesList";
import PendingMeetingRequests from "./PendingMeetingRequests";

export default function ManagementHomePage() {
  return (
    <RequireRole allow={["management"]}>
      <ManagementShell title="Management">
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 8 }}>
          <Link href="/panel/management/estudios" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            Calendario de estudios de grabación →
          </Link>
          <Link href="/panel/management/asignaciones" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            Gestionar asignaciones de PM →
          </Link>
          <Link href="/panel/management/cm-asignaciones" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            Gestionar asignaciones de Community Manager →
          </Link>
        </div>
        <div className="mgmt-section">
          <div className="mgmt-section-label">Reuniones de Management</div>
          <ManagementMeetingsCalendar mode="management" />
        </div>
        <PendingMeetingRequests />
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
