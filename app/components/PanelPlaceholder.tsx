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
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#2a241c 0%,#3a3226 55%,#2a241c 100%)",
        color: "#f4ede1",
        fontFamily: "-apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 13.5, color: "#c2b39a", maxWidth: 380 }}>
        {session?.user?.email} — este panel todavía no tiene funcionalidad propia construida.
        Contactá al administrador si necesitás algo específico acá.
      </p>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{ marginTop: 12, background: "transparent", border: "1px solid #544831", borderRadius: 8, padding: "8px 16px", color: "#c2b39a", cursor: "pointer", fontSize: 13 }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
