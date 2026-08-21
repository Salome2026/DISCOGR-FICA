"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { Role } from "@/lib/permissions";

export default function RequireRole({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: Role | null } | undefined)?.role ?? null;
  const invalid = (session?.user as { invalid?: boolean } | undefined)?.invalid;
  // admin always passes every single-purpose module's gate — same principle
  // ROLE_PERMISSIONS.admin=ALL already gives it everywhere hasPermission()
  // is used, this closes the gap for the modules that instead gate on an
  // exact role match (Legal/Editorial/Management/Booking/Tour Manager/...).
  const authorized = status === "authenticated" && !invalid && !!role && (role === "admin" || allow.includes(role));

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
    if (status === "authenticated" && (invalid || !role)) {
      signOut({ redirect: false }).then(() => router.replace("/"));
    }
  }, [status, invalid, role, router]);

  // The landing page's scroll position (deep into the scroll-hero) otherwise
  // carries over into whatever page router.push lands on after login, so
  // the destination can open scrolled past its own top content.
  useEffect(() => {
    if (authorized) window.scrollTo(0, 0);
  }, [authorized]);

  if (status === "loading" || status === "unauthenticated") {
    return <FullPageMessage text="Cargando..." />;
  }
  if (invalid || !role) {
    return <FullPageMessage text="Redirigiendo..." />;
  }
  if (role !== "admin" && !allow.includes(role)) {
    return <AccesoDenegado />;
  }
  return <>{children}</>;
}

function FullPageMessage({ text }: { text: string }) {
  return (
    <div
      className="bg-atmosphere"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontFamily: "var(--font-display)" }}
    >
      {text}
    </div>
  );
}

export function AccesoDenegado() {
  return (
    <div
      className="bg-atmosphere"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "var(--text-1)",
        fontFamily: "var(--font-display)",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(28px) saturate(1.7)",
          WebkitBackdropFilter: "blur(28px) saturate(1.7)",
          fontSize: 24,
        }}
      >
        🔒
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>Acceso denegado</h1>
      <p style={{ fontSize: 14, color: "var(--text-2)", maxWidth: 360 }}>
        No tenés permisos para acceder a este módulo.
      </p>
      <a href="/" style={{ color: "var(--accent-color)", fontSize: 13, marginTop: 8 }}>
        Volver al inicio
      </a>
    </div>
  );
}
