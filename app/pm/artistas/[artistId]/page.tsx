"use client";

import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { PMShell } from "../../_shared";

type Artist = { id: string; name: string; sello: string | null; photoUrl: string | null };
type Profile = { planAnual: string | null; objetivosGenerales: string | null } | null;
type ActionItem = { id: number; title: string; done: boolean; doneBy: string | null; doneAt: string | null };
type Note = { id: number; authorEmail: string; body: string; createdAt: string };

type Bundle = {
  artist: Artist;
  profile: Profile;
  actionItems: ActionItem[];
  notes: Note[];
};

const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 };
const sectionLabelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--text-1)" };
const textareaStyle: React.CSSProperties = {
  width: "100%", minHeight: 100, background: "var(--bg-2)", border: "1px solid var(--line-soft)",
  borderRadius: 8, padding: "10px 12px", color: "var(--text-1)", fontSize: 13.5, fontFamily: "inherit", resize: "vertical",
};
const smallBtn: React.CSSProperties = {
  background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8,
  padding: "6px 14px", color: "var(--text-1)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", alignSelf: "flex-start",
};

function ArtistProfileInner({ artistId }: { artistId: string }) {
  const [data, setData] = useState<Bundle | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [planAnual, setPlanAnual] = useState("");
  const [objetivos, setObjetivos] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newNote, setNewNote] = useState("");

  function load() {
    fetch(`/api/pm/artistas/${artistId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setData(null);
          return;
        }
        setData(d);
        setPlanAnual(d.profile?.planAnual ?? "");
        setObjetivos(d.profile?.objetivosGenerales ?? "");
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await fetch(`/api/pm/artistas/${artistId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planAnual, objetivosGenerales: objetivos }),
      });
      load();
    } finally {
      setSavingProfile(false);
    }
  }

  async function addItem() {
    if (!newItem.trim()) return;
    await fetch(`/api/pm/artistas/${artistId}/action-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newItem.trim() }),
    });
    setNewItem("");
    load();
  }

  async function toggleItem(itemId: number, done: boolean) {
    await fetch(`/api/pm/artistas/${artistId}/action-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    load();
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await fetch(`/api/pm/artistas/${artistId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNote.trim() }),
    });
    setNewNote("");
    load();
  }

  if (data === undefined) {
    return (
      <PMShell title="Cargando..." backHref="/pm/artistas">
        <p style={{ color: "var(--text-3)" }}>Cargando...</p>
      </PMShell>
    );
  }
  if (!data) {
    return (
      <PMShell title="No disponible" backHref="/pm/artistas">
        <p style={{ color: "var(--crit-ink)" }}>{error ?? "No se pudo cargar este artista."}</p>
      </PMShell>
    );
  }

  const pendientes = data.actionItems.filter((i) => !i.done);
  const realizadas = data.actionItems.filter((i) => i.done);

  return (
    <PMShell title={data.artist.name} subtitle={data.artist.sello ?? undefined} backHref="/pm/artistas">
      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Plan anual del artista</div>
        <textarea style={textareaStyle} value={planAnual} onChange={(e) => setPlanAnual(e.target.value)} placeholder="Objetivos, hitos y estrategia del año para este artista..." />
        <div style={sectionLabelStyle}>Objetivos generales</div>
        <textarea style={textareaStyle} value={objetivos} onChange={(e) => setObjetivos(e.target.value)} placeholder="Objetivos generales del proyecto..." />
        <button style={smallBtn} onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Calendario de lanzamientos</div>
        <ReleaseCalendar readOnly apiUrl={`/api/pm/artistas/${artistId}/releases-calendar`} />
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Próximas acciones y temas pendientes</div>
        {pendientes.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin pendientes.</p>}
        {pendientes.map((i) => (
          <label key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input type="checkbox" checked={false} onChange={() => toggleItem(i.id, true)} />
            {i.title}
          </label>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Nueva acción o tema pendiente..."
            style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", color: "var(--text-1)", fontSize: 13 }}
          />
          <button style={smallBtn} onClick={addItem}>Agregar</button>
        </div>
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Historial de acciones realizadas</div>
        {realizadas.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Todavía no hay acciones completadas.</p>}
        {realizadas.map((i) => (
          <label key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--text-3)" }}>
            <input type="checkbox" checked={true} onChange={() => toggleItem(i.id, false)} />
            <span style={{ textDecoration: "line-through" }}>{i.title}</span>
          </label>
        ))}
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Anotaciones del PM</div>
        {data.notes.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin anotaciones todavía.</p>}
        {data.notes.map((n) => (
          <div key={n.id} style={{ fontSize: 13, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
            <div style={{ color: "var(--text-3)", fontSize: 11 }}>
              {n.authorEmail} · {new Date(n.createdAt).toLocaleString("es-AR")}
            </div>
            {n.body}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="Nueva anotación..."
            style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", color: "var(--text-1)", fontSize: 13 }}
          />
          <button style={smallBtn} onClick={addNote}>Agregar</button>
        </div>
      </div>
    </PMShell>
  );
}

export default function ArtistProfilePage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <ArtistProfileInner artistId={artistId} />
    </RequireRole>
  );
}
