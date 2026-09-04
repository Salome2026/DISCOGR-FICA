"use client";

import RequireRole from "@/app/components/RequireRole";
import ManagementMeetingsCalendar from "@/app/components/ManagementMeetingsCalendar";
import { ManagementShell } from "../_shared";

export default function ManagementMeetingsPage() {
  return (
    <RequireRole allow={["admin", "management"]}>
      <ManagementShell title="Reuniones de Management" backHref="/panel/management">
        <ManagementMeetingsCalendar mode="management" />
      </ManagementShell>
    </RequireRole>
  );
}
