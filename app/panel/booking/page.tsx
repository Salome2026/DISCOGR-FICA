"use client";

import RequireRole from "@/app/components/RequireRole";
import { BookingShell } from "./_shared";
import ShowCalendar from "./ShowCalendar";
import ContactsPanel from "./ContactsPanel";
import StatsStrip from "./StatsStrip";
import ArtistAgenda from "./ArtistAgenda";

export default function BookingHomePage() {
  return (
    <RequireRole allow={["booking"]}>
      <BookingShell>
        <StatsStrip />
        <div className="bkg-section">
          <ShowCalendar />
        </div>
        <ArtistAgenda />
        <div className="bkg-section" style={{ marginTop: "2.5rem" }}>
          <ContactsPanel />
        </div>
      </BookingShell>
    </RequireRole>
  );
}
