"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import RequireRole from "@/app/components/RequireRole";
import ReleaseCalendar from "@/app/dashboard/ReleaseCalendar";
import { PMShell } from "../../_shared";

type Artist = { id: string; name: string; sello: string | null; photoUrl: string | null };
type Profile = { planAnual: string | null; objetivosGenerales: string | null } | null;
type ActionItem = { id: number; title: string; done: boolean; doneBy: string | null; doneAt: string | null };
type Note = { id: number; authorEmail: string; body: string; createdAt: string };
type MeetingRequest = {
  id: string; comment: string; priority: string; suggestedDate: string | null; status: string;
  scheduledDate: string | null; scheduledTime: string | null; managementNotes: string | null; createdAt: string;
};

type Bundle = {
  artist: Artist;
  profile: Profile;
  actionItems: ActionItem[];
  notes: Note[];
};

const PRIORITIES = ["Alta", "Media", "Baja"];
const STATUS_TONE: Record<string, string> = { Pendiente: "var(--warn-ink)", Agendada: "var(--accent)", Realizada: "var(--good-ink)" };

function formatFecha(fecha: string | null): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 };
const sectionLabelStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "var(--text-1)" };
const textareaStyle: React.CSSProperties = {
  width: "100%", minHeight: 150, background: "var(--bg-2)", border: "1px solid var(--line-soft)",
  borderRadius: 10, padding: "14px 16px", color: "var(--text-1)", fontSize: 16, fontFamily: "inherit", resize: "vertical", lineHeight: 1.5,
};
const smallBtn: React.CSSProperties = {
  background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 10,
  padding: "11px 22px", color: "var(--text-1)", fontWeight: 600, fontSize: 15, cursor: "pointer", alignSelf: "flex-start",
};
const listInputStyle: React.CSSProperties = {
  flex: 1, background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10,
  padding: "12px 16px", color: "var(--text-1)", fontSize: 15.5,
};
const checkboxStyle: React.CSSProperties = { width: 20, height: 20, cursor: "pointer" };

type AnnualPlanSummary = { periodStart: string | null; periodEnd: string | null; cantidadLanzamientosProyectados: number | null };

function ArtistProfileInner({ artistId }: { artistId: string }) {
  const [data, setData] = useState<Bundle | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [annualPlan, setAnnualPlan] = useState<AnnualPlanSummary | null | undefined>(undefined);
  const [newItem, setNewItem] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingComment, setMeetingComment] = useState("");
  const [meetingPriority, setMeetingPriority] = useState("Media");
  const [meetingSuggestedDate, setMeetingSuggestedDate] = useState("");
  const [sendingMeeting, setSendingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handlePhotoFile(file: File) {
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: `/api/pm/artistas/${artistId}/photo`,
      });
      const res = await fetch(`/api/pm/artistas/${artistId}/photo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: blob.url }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "No se pudo guardar la foto.");
      load();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Error al subir la foto.");
    } finally {
      setUploadingPhoto(false);
    }
  }

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
      })
      .catch((e) => setError(String(e)));
    fetch(`/api/pm/artistas/${artistId}/meeting-requests`)
      .then((r) => r.json())
      .then((d) => setMeetingRequests(d.requests ?? []));
    fetch(`/api/pm/artistas/${artistId}/plan-anual`)
      .then((r) => r.json())
      .then((d) => setAnnualPlan(d.plan ?? null));
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

  async function addItem() {
    if (!newItem.trim() || addingItem) return;
    setAddingItem(true);
    const title = newItem.trim();
    setNewItem(""); // clear right away — the guard above is what actually stops duplicates, this just avoids the input sitting there looking unresponsive
    try {
      await fetch(`/api/pm/artistas/${artistId}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      load();
    } finally {
      setAddingItem(false);
    }
  }

  async function toggleItem(itemId: number, done: boolean) {
    await fetch(`/api/pm/artistas/${artistId}/action-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    load();
  }

  async function deleteItem(itemId: number) {
    await fetch(`/api/pm/artistas/${artistId}/action-items/${itemId}`, { method: "DELETE" });
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

  async function sendMeetingRequest() {
    if (!meetingComment.trim()) {
      setMeetingError("Falta el comentario o temario de la reunión.");
      return;
    }
    setSendingMeeting(true);
    setMeetingError(null);
    try {
      const res = await fetch(`/api/pm/artistas/${artistId}/meeting-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: meetingComment.trim(), priority: meetingPriority, suggestedDate: meetingSuggestedDate || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo enviar la solicitud.");
      setShowMeetingModal(false);
      setMeetingComment("");
      setMeetingPriority("Media");
      setMeetingSuggestedDate("");
      load();
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSendingMeeting(false);
    }
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {data.artist.photoUrl ? (
            <img src={data.artist.photoUrl} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 12, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "var(--text-2)", flexShrink: 0 }}>
              {data.artist.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ ...smallBtn, alignSelf: "flex-start" }}>
              {uploadingPhoto ? "Subiendo..." : data.artist.photoUrl ? "Cambiar foto" : "Agregar foto"}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) handlePhotoFile(f);
                }}
                disabled={uploadingPhoto}
                style={{ display: "none" }}
              />
            </label>
            {photoError && <span style={{ color: "var(--crit-ink)", fontSize: 13 }}>{photoError}</span>}
          </div>
        </div>
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={sectionLabelStyle}>Plan Anual</div>
          <Link href={`/pm/artistas/${artistId}/plan-anual`} style={{ ...smallBtn, textDecoration: "none", display: "inline-block" }}>
            {annualPlan ? "Abrir plan anual completo →" : "Crear plan anual →"}
          </Link>
        </div>
        {annualPlan === undefined && <p style={{ color: "var(--text-3)", fontSize: 15 }}>Cargando...</p>}
        {annualPlan === null && <p style={{ color: "var(--text-3)", fontSize: 15 }}>Todavía no se creó un plan anual para este artista.</p>}
        {annualPlan && (
          <p style={{ color: "var(--text-2)", fontSize: 15 }}>
            {annualPlan.periodStart && annualPlan.periodEnd
              ? `Período ${formatFecha(annualPlan.periodStart)} - ${formatFecha(annualPlan.periodEnd)}`
              : "Período sin definir"}
            {annualPlan.cantidadLanzamientosProyectados != null && ` · ${annualPlan.cantidadLanzamientosProyectados} lanzamientos proyectados`}
          </p>
        )}
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Calendario de lanzamientos</div>
        <ReleaseCalendar readOnly apiUrl={`/api/pm/artistas/${artistId}/releases-calendar`} />
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Próximas acciones y temas pendientes</div>
        {pendientes.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 15 }}>Sin pendientes.</p>}
        {pendientes.map((i) => (
          <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16, flex: 1 }}>
              <input type="checkbox" checked={false} onChange={() => toggleItem(i.id, true)} style={checkboxStyle} />
              {i.title}
            </label>
            <button
              onClick={() => deleteItem(i.id)}
              style={{ background: "transparent", border: "none", color: "var(--crit-ink)", cursor: "pointer", fontSize: 13, padding: "2px 6px" }}
              aria-label="Eliminar"
            >
              Eliminar
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Nueva acción o tema pendiente..."
            style={listInputStyle}
          />
          <button style={smallBtn} onClick={addItem} disabled={addingItem}>{addingItem ? "..." : "Agregar"}</button>
        </div>
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Historial de acciones realizadas</div>
        {realizadas.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 15 }}>Todavía no hay acciones completadas.</p>}
        {realizadas.map((i) => (
          <label key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16, color: "var(--text-3)" }}>
            <input type="checkbox" checked={true} onChange={() => toggleItem(i.id, false)} style={checkboxStyle} />
            <span style={{ textDecoration: "line-through" }}>{i.title}</span>
          </label>
        ))}
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={sectionLabelStyle}>Anotaciones del PM</div>
        {data.notes.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 15 }}>Sin anotaciones todavía.</p>}
        {data.notes.map((n) => (
          <div key={n.id} style={{ fontSize: 15.5, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>
              {n.authorEmail} · {new Date(n.createdAt).toLocaleString("es-AR")}
            </div>
            {n.body}
          </div>
        ))}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="Nueva anotación..."
            style={listInputStyle}
          />
          <button style={smallBtn} onClick={addNote}>Agregar</button>
        </div>
      </div>

      <div className="pmx-card" style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={sectionLabelStyle}>Reuniones con Management</div>
          <button
            style={{ ...smallBtn, alignSelf: "auto" }}
            onClick={() => {
              setMeetingError(null);
              setShowMeetingModal(true);
            }}
          >
            Solicitar reunión con Management
          </button>
        </div>
        {meetingRequests.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 15 }}>Todavía no se solicitó ninguna reunión.</p>}
        {meetingRequests.map((r) => (
          <div key={r.id} style={{ fontSize: 15.5, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: STATUS_TONE[r.status] ?? "var(--text-1)" }}>{r.status}</span>
              <span style={{ color: "var(--text-3)", fontSize: 13 }}>
                Prioridad {r.priority} · Solicitada {new Date(r.createdAt).toLocaleDateString("es-AR")}
                {r.suggestedDate && ` · Sugerida ${formatFecha(r.suggestedDate)}`}
              </span>
            </div>
            <div style={{ marginTop: 6 }}>{r.comment}</div>
            {r.status === "Agendada" && (r.scheduledDate || r.scheduledTime) && (
              <div style={{ color: "var(--accent)", marginTop: 6 }}>
                Agendada para {formatFecha(r.scheduledDate) || "?"} {r.scheduledTime ?? ""}
              </div>
            )}
            {r.managementNotes && <div style={{ color: "var(--text-3)", marginTop: 6 }}>Nota de Management: {r.managementNotes}</div>}
          </div>
        ))}
      </div>

      {showMeetingModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
          onClick={() => setShowMeetingModal(false)}
        >
          <div className="pmx-card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 16, width: 560, maxWidth: "95vw" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Solicitar reunión con Management</div>
            <div>
              <div style={{ fontSize: 14.5, color: "var(--text-2)" }}>Artista</div>
              <input value={data.artist.name} disabled style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "12px 16px", color: "var(--text-3)", fontSize: 15.5, marginTop: 6 }} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, color: "var(--text-2)" }}>Comentario o temario de la reunión</div>
              <textarea value={meetingComment} onChange={(e) => setMeetingComment(e.target.value)} style={{ ...textareaStyle, minHeight: 100, marginTop: 6 }} />
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14.5, color: "var(--text-2)" }}>Prioridad</div>
                <select value={meetingPriority} onChange={(e) => setMeetingPriority(e.target.value)} style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "12px 16px", color: "var(--text-1)", fontSize: 15.5, marginTop: 6 }}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14.5, color: "var(--text-2)" }}>Fecha sugerida (opcional)</div>
                <input type="date" value={meetingSuggestedDate} onChange={(e) => setMeetingSuggestedDate(e.target.value)} style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "12px 16px", color: "var(--text-1)", fontSize: 15.5, marginTop: 6 }} />
              </div>
            </div>
            {meetingError && <div style={{ color: "var(--crit-ink)", fontSize: 15 }}>{meetingError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowMeetingModal(false)} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "12px 20px", color: "var(--text-2)", cursor: "pointer", fontSize: 15 }}>
                Cancelar
              </button>
              <button onClick={sendMeetingRequest} disabled={sendingMeeting} style={{ background: "var(--accent-gradient)", border: "none", borderRadius: 10, padding: "12px 26px", color: "var(--accent-ink)", fontWeight: 700, cursor: "pointer", fontSize: 16 }}>
                {sendingMeeting ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
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
