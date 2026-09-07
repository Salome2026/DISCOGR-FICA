"use client";

import { SessionProvider } from "next-auth/react";
import TotpEnforcer from "./components/TotpEnforcer";
import ArAgentWidget from "./components/ArAgentWidget";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TotpEnforcer />
      <ArAgentWidget />
      {children}
    </SessionProvider>
  );
}
