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
      className="bg-atmosphere"
      style={{
        minHeight: "100vh",
        color: "var(--text-1)",
        fontFamily: "var(--font-display)",
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
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>Carga de lanzamientos</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>{session?.user?.email}</p>
      </div>

      {justSaved && (
        <div style={{ background: "var(--good-bg)", color: "var(--good-ink)", padding: "10px 18px", borderRadius: 10, fontSize: 13.5 }}>
          Lanzamiento guardado. Ya quedó visible para el equipo.
        </div>
      )}

      <button
        onClick={() => setShowForm(true)}
        style={{
          background: "var(--accent-glass-bg)",
          border: "1px solid var(--accent-glass-border)",
          borderRadius: 10,
          padding: "14px 28px",
          color: "var(--text-1)",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
          backdropFilter: "blur(28px) saturate(1.7)",
          WebkitBackdropFilter: "blur(28px) saturate(1.7)",
          boxShadow: "var(--shadow-glass)",
        }}
      >
        + Nuevo lanzamiento
      </button>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}
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
