"use client";

import { signOut, useSession } from "next-auth/react";
import RequireRole from "./RequireRole";
import type { Role } from "@/lib/permissions";

export default function PanelPlaceholder({ role, title }: { role: Role; title: string }) {
  return (
    <RequireRole allow={[role]}>
      <Inner title={title} />
    </RequireRole>
  );
}

function Inner({ title }: { title: string }) {
  const { data: session } = useSession();
  return (
    <div
      className="bg-atmosphere"
      style={{
        minHeight: "100vh",
        color: "var(--text-1)",
        fontFamily: "var(--font-display)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>{title}</h1>
      <p style={{ fontSize: 13.5, color: "var(--text-2)", maxWidth: 380 }}>
        {session?.user?.email} — este panel todavía no tiene funcionalidad propia construida.
        Contactá al administrador si necesitás algo específico acá.
      </p>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{
          marginTop: 12,
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: 8,
          padding: "8px 16px",
          color: "var(--text-2)",
          cursor: "pointer",
          fontSize: 13,
          backdropFilter: "blur(20px) saturate(1.7)",
          WebkitBackdropFilter: "blur(20px) saturate(1.7)",
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
