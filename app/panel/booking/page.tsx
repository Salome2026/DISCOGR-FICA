"use client";

import RequireRole from "@/app/components/RequireRole";
import { BookingShell } from "./_shared";
import ShowCalendar from "./ShowCalendar";

export default function BookingHomePage() {
  return (
    <RequireRole allow={["booking"]}>
      <BookingShell>
        <div className="bkg-section">
          <ShowCalendar />
        </div>
      </BookingShell>
    </RequireRole>
  );
}
