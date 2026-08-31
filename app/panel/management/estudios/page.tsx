"use client";

import RequireRole from "@/app/components/RequireRole";
import StudioCalendar from "@/app/components/StudioCalendar";
import { ManagementShell } from "../_shared";

export default function EstudiosPage() {
  return (
    <RequireRole allow={["admin", "management"]}>
      <ManagementShell title="Calendario de estudios de grabación" backHref="/panel/management">
        <StudioCalendar mode="management" />
      </ManagementShell>
    </RequireRole>
  );
}
