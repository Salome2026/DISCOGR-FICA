"use client";

import dynamic from "next/dynamic";
import RequireRole from "@/app/components/RequireRole";
import { BookingShell } from "./_shared";
import ShowCalendar from "./ShowCalendar";
import ContactsPanel from "./ContactsPanel";
import StatsStrip from "./StatsStrip";
import ArtistAgenda from "./ArtistAgenda";

// Leaflet touches window/document at import time — must never run during SSR.
const ShowMap = dynamic(() => import("./ShowMap"), { ssr: false });

export default function BookingHomePage() {
  return (
    <RequireRole allow={["booking"]}>
      <BookingShell>
        <StatsStrip />
        <div className="bkg-section bkg-calendar-map-row">
          <ShowCalendar />
          <ShowMap />
        </div>
        <ArtistAgenda />
        <div className="bkg-section" style={{ marginTop: "2.5rem" }}>
          <ContactsPanel />
        </div>
      </BookingShell>
    </RequireRole>
  );
}
