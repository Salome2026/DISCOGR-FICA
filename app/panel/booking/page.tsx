"use client";

import RequireRole from "@/app/components/RequireRole";
import { BookingShell } from "./_shared";
import ShowCalendar from "./ShowCalendar";
import ContactsPanel from "./ContactsPanel";

export default function BookingHomePage() {
  return (
    <RequireRole allow={["booking"]}>
      <BookingShell>
        <div className="bkg-section">
          <ShowCalendar />
        </div>
        <div className="bkg-section">
          <ContactsPanel />
        </div>
      </BookingShell>
    </RequireRole>
  );
}
