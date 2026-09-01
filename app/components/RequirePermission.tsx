"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { hasPermission, type Permission, type SessionUser } from "@/lib/permissions";
import { AccesoDenegado } from "@/app/components/RequireRole";

// Like RequireRole, but for capabilities shared across multiple roles
// (marketing + project_manager can both see Playlists, at different depths)
// instead of a single module owned exclusively by one role.
export default function RequirePermission({
  need,
  children,
}: {
  need: Permission;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as unknown as SessionUser | undefined;
  const invalid = (session?.user as { invalid?: boolean } | undefined)?.invalid;
  const authorized = status === "authenticated" && !invalid && !!user && hasPermission(user, need);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
    if (status === "authenticated" && (invalid || !user?.roles?.length)) {
      signOut({ redirect: false }).then(() => router.replace("/"));
    }
  }, [status, invalid, user?.roles?.length, router]);

  useEffect(() => {
    if (authorized) window.scrollTo(0, 0);
  }, [authorized]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="bg-atmosphere" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontFamily: "var(--font-display)" }}>
        Cargando...
      </div>
    );
  }
  if (invalid || !user?.roles?.length) {
    return (
      <div className="bg-atmosphere" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontFamily: "var(--font-display)" }}>
        Redirigiendo...
      </div>
    );
  }
  if (!hasPermission(user, need)) {
    return <AccesoDenegado />;
  }
  return <>{children}</>;
}
