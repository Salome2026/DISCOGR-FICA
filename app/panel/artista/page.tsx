"use client";

import { signOut, useSession } from "next-auth/react";
import RequireRole from "@/app/components/RequireRole";

export default function ArtistaPanel() {
  return (
    <RequireRole allow={["artista", "representante"]}>
      <Inner />
    </RequireRole>
  );
}

function Inner() {
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
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Panel del Artista</h1>
      <p style={{ fontSize: 13.5, color: "#c2b39a", maxWidth: 420 }}>
        {session?.user?.email} — todavía no hay una forma automática de saber qué artista de
        nuestro catálogo sos vos (no hay un ID que vincule tu cuenta de login con tu ficha de
        artista). Cuando el administrador te asocie a tu perfil, acá vas a ver tus lanzamientos,
        acuerdos, estado de releases y archivos.
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
