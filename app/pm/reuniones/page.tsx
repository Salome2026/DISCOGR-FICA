"use client";

import RequireRole from "@/app/components/RequireRole";
import ManagementMeetingsCalendar from "@/app/components/ManagementMeetingsCalendar";
import { PMShell } from "../_shared";

export default function PmMeetingsPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="Reuniones de Management" backHref="/pm">
        <ManagementMeetingsCalendar mode="pm" />
      </PMShell>
    </RequireRole>
  );
}
