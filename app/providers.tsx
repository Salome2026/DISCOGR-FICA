"use client";

import { SessionProvider } from "next-auth/react";
import TotpEnforcer from "./components/TotpEnforcer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TotpEnforcer />
      {children}
    </SessionProvider>
  );
}
