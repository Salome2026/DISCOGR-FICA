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

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
    if (status === "authenticated" && (invalid || !role)) {
      signOut({ redirect: false }).then(() => router.replace("/"));
    }
  }, [status, invalid, role, router]);

  if (status === "loading" || status === "unauthenticated") {
    return <FullPageMessage text="Cargando..." />;
  }
  if (invalid || !role) {
    return <FullPageMessage text="Redirigiendo..." />;
  }
  if (!allow.includes(role)) {
    return <AccesoDenegado />;
  }
  return <>{children}</>;
}

function FullPageMessage({ text }: { text: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#2a241c", color: "#8f8267" }}>
      {text}
    </div>
  );
}

export function AccesoDenegado() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "#2a241c",
        color: "#f4ede1",
        fontFamily: "-apple-system, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: 40 }}>🔒</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Acceso denegado</h1>
      <p style={{ fontSize: 14, color: "#c2b39a", maxWidth: 360 }}>
        No tenés permisos para acceder a este módulo.
      </p>
      <a href="/" style={{ color: "#e6a94f", fontSize: 13, marginTop: 8 }}>
        Volver al inicio
      </a>
    </div>
  );
}
