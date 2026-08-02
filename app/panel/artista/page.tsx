"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import RequireRole from "@/app/components/RequireRole";
import NuevoLanzamientoForm from "@/app/pm/NuevoLanzamientoForm";

export default function ArtistaPanel() {
  return (
    <RequireRole allow={["artista", "representante"]}>
      <Inner />
    </RequireRole>
  );
}

function Inner() {
  const { data: session } = useSession();
  const [showForm, setShowForm] = useState(false);
  const [assignedArtists, setAssignedArtists] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (!loaded) {
    fetch("/api/pm/assigned-artists")
      .then((r) => r.json())
      .then((d) => {
        setAssignedArtists(d.artists ?? []);
        setLoaded(true);
      });
  }

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
        gap: 16,
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Carga de lanzamientos</h1>
        <p style={{ fontSize: 13, color: "#8f8267", marginTop: 6 }}>{session?.user?.email}</p>
      </div>

      {justSaved && (
        <div style={{ background: "#3a4032", color: "#d3e6c9", padding: "10px 18px", borderRadius: 10, fontSize: 13.5 }}>
          Lanzamiento guardado. Ya quedó visible para el equipo.
        </div>
      )}

      <button
        onClick={() => setShowForm(true)}
        style={{
          background: "#e6a94f",
          border: "none",
          borderRadius: 10,
          padding: "14px 28px",
          color: "#3a2b0f",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        + Nuevo lanzamiento
      </button>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{ background: "transparent", border: "1px solid #544831", borderRadius: 8, padding: "8px 16px", color: "#c2b39a", cursor: "pointer", fontSize: 13 }}
      >
        Cerrar sesión
      </button>

      {showForm && (
        <NuevoLanzamientoForm
          role="project_manager"
          assignedArtists={assignedArtists}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            setJustSaved(true);
          }}
        />
      )}
    </div>
  );
}
