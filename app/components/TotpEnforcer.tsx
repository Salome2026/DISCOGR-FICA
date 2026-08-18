"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

// 2FA is mandatory for the admin role (decided 2026-08-18) — a NextAuth
// session for an admin without totp_enabled gets confined to /cuenta until
// they enroll. There's no middleware.ts in this app, so this reuses the
// session data next-auth already fetches instead of adding one — auth.ts's
// jwt callback re-reads totp_enabled from the DB on every refresh, so this
// clears itself the moment setup completes, no explicit re-check needed.
export default function TotpEnforcer() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    const user = session?.user as { role?: string; totpEnabled?: boolean } | undefined;
    if (user?.role !== "admin" || user.totpEnabled) return;
    if (pathname !== "/cuenta") router.replace("/cuenta");
  }, [status, session, pathname, router]);

  return null;
}
