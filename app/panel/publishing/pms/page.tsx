"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { PublishingShell } from "../_shared";

type PmArtist = { artistId: string; artistName: string; photoUrl: string | null; role: "owner" | "collaborator"; responsiblePms: string[] };
type Pm = { email: string; name: string; artists: PmArtist[] };

type PendingTask = {
  id: string; artistId: string; artistName: string; targetPms: string[]; requestedBy: string;
  titulo: string; descripcion: string | null; status: "Pendiente" | "Resuelto";
  pmResponse: string | null; respondedBy: string | null; respondedAt: string | null; createdAt: string;
};

function formatDate(v: string): string {
  return new Date(v).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusBadgeStyle(status: "Pendiente" | "Resuelto"): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
    padding: "2px 8px", borderRadius: 100, flexShrink: 0,
    background: status === "Resuelto" ? "var(--good-bg)" : "var(--warn-bg)",
    color: status === "Resuelto" ? "var(--good-ink)" : "var(--warn-ink)",
  };
}

function TaskModal({
  artist, pmEmails, onClose, onSent,
}: {
  artist: { artistId: string; artistName: string };
  pmEmails: string[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedPms, setSelectedPms] = useState<string[]>(pmEmails);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePm(email: string) {
    setSelectedPms((prev) => (prev.includes(email) ? prev.filter((p) => p !== email) : [...prev, email]));
  }

  async function handleSubmit() {
    if (selectedPms.length === 0) {
      setError("Elegí a quién dirigir el pendiente.");
      return;
    }
    if (!titulo.trim()) {
      setError("Falta el título del pendiente.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/publishing/pms/${artist.artistId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPms: selectedPms,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          artistName: artist.artistName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el pendiente.");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="pub-card" onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Nuevo pendiente para {artist.artistName}</div>

        <div>
          <label style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 6, display: "block", fontWeight: 600 }}>Título</label>
          <input className="pub-search" style={{ width: "100%" }} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Falta el detalle de coautores" />
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 6, display: "block", fontWeight: 600 }}>Descripción (opcional)</label>
          <textarea
            className="pub-search"
            style={{ width: "100%", minHeight: 90, resize: "vertical" }}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 6, display: "block", fontWeight: 600 }}>Dirigir a</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
            {pmEmails.map((email) => (
              <label key={email} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={selectedPms.includes(email)} onChange={() => togglePm(email)} />
                {email}
              </label>
            ))}
          </div>
        </div>

        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="pub-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="pub-btn-primary" disabled={sending} onClick={handleSubmit}>
            {sending ? "Enviando..." : "Enviar pendiente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtistHistory({ artistId }: { artistId: string }) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<PendingTask[] | null>(null);

  function load() {
    fetch(`/api/publishing/pms/${artistId}/tasks`)
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []));
  }

  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !tasks) load();
        }}
        style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 11.5, cursor: "pointer", textDecoration: "underline", padding: 0 }}
      >
        {open ? "Ocultar historial" : "Ver historial"}
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          {tasks === null && <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>Cargando...</span>}
          {tasks?.length === 0 && <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>Sin pendientes todavía.</span>}
          {tasks?.map((t) => (
            <div key={t.id} style={{ fontSize: 11.5, borderTop: "1px solid var(--line-soft)", paddingTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{t.titulo}</span>
                <span style={statusBadgeStyle(t.status)}>{t.status}</span>
              </div>
              <div style={{ color: "var(--text-3)" }}>{formatDate(t.createdAt)} · a {t.targetPms.join(", ")}</div>
              {t.descripcion && <div style={{ marginTop: 2 }}>{t.descripcion}</div>}
              {t.pmResponse && <div style={{ marginTop: 2, color: "var(--good-ink)" }}>Respuesta: {t.pmResponse}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublishingPmsInner() {
  const [pms, setPms] = useState<Pm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPm, setFilterPm] = useState("");
  const [filterArtist, setFilterArtist] = useState("");
  const [taskModal, setTaskModal] = useState<{ artistId: string; artistName: string; pmEmails: string[] } | null>(null);
  const [sentNotice, setSentNotice] = useState(false);

  useEffect(() => {
    fetch("/api/publishing/pms").then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setPms(d.pms)));
  }, []);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const pm of pms ?? []) for (const a of pm.artists) set.add(a.artistName);
    return [...set].sort();
  }, [pms]);

  const filteredPms = useMemo(() => {
    if (!pms) return [];
    return pms
      .filter((pm) => !filterPm || pm.email === filterPm)
      .map((pm) => ({ ...pm, artists: pm.artists.filter((a) => !filterArtist || a.artistName === filterArtist) }))
      .filter((pm) => pm.artists.length > 0);
  }, [pms, filterPm, filterArtist]);

  return (
    <PublishingShell title="Project Managers responsables" subtitle="Poné un pendiente sobre el artista de cualquier PM" backHref="/panel/publishing">
      {error && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {sentNotice && (
        <div style={{ background: "var(--good-bg)", color: "var(--good-ink)", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          ✓ Pendiente enviado.{" "}
          <button type="button" onClick={() => setSentNotice(false)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline" }}>
            Cerrar
          </button>
        </div>
      )}

      <div className="pub-filter-row">
        <select value={filterPm} onChange={(e) => setFilterPm(e.target.value)}>
          <option value="">Todos los PM</option>
          {(pms ?? []).map((pm) => <option key={pm.email} value={pm.email}>{pm.name}</option>)}
        </select>
        <select value={filterArtist} onChange={(e) => setFilterArtist(e.target.value)}>
          <option value="">Todos los artistas</option>
          {artistOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {pms === null ? (
        <p style={{ color: "var(--text-3)" }}>Cargando...</p>
      ) : filteredPms.length === 0 ? (
        <p style={{ color: "var(--text-3)" }}>No hay resultados con estos filtros.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredPms.map((pm) => (
            <div key={pm.email}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div className="pub-artist-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{pm.name.charAt(0).toUpperCase()}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{pm.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{pm.email}</div>
              </div>
              <div className="pub-pm-grid">
                {pm.artists.map((a) => (
                  <div key={`${pm.email}-${a.artistId}`} className="pub-card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.artistName}</div>
                      {a.role === "collaborator" && <span className="pub-artist-tag externo">Compartido</span>}
                    </div>
                    <button
                      type="button"
                      className="pub-btn-ghost"
                      style={{ fontSize: 11.5, padding: "4px 8px", alignSelf: "flex-start" }}
                      onClick={() => setTaskModal({ artistId: a.artistId, artistName: a.artistName, pmEmails: a.responsiblePms })}
                    >
                      Poner pendiente
                    </button>
                    <ArtistHistory artistId={a.artistId} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {taskModal && (
        <TaskModal
          artist={taskModal}
          pmEmails={taskModal.pmEmails}
          onClose={() => setTaskModal(null)}
          onSent={() => {
            setTaskModal(null);
            setSentNotice(true);
          }}
        />
      )}
    </PublishingShell>
  );
}

export default function PublishingPmsPage() {
  return (
    <RequireRole allow={["editorial", "management"]}>
      <PublishingPmsInner />
    </RequireRole>
  );
}
