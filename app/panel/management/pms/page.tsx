"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { ManagementShell } from "../_shared";

type PmArtist = { artistId: string; artistName: string; photoUrl: string | null; role: "owner" | "collaborator"; responsiblePms: string[] };
type Pm = { email: string; name: string; artists: PmArtist[] };

type PendingTask = {
  id: string; artistId: string; artistName: string; targetPms: string[]; requestedBy: string;
  titulo: string; descripcion: string | null; status: "Pendiente" | "Resuelto";
  pmResponse: string | null; respondedBy: string | null; respondedAt: string | null; createdAt: string;
};

const modalOverlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
};
const fieldLabel: React.CSSProperties = { fontSize: 12.5, color: "var(--text-2)" };
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8,
  padding: "8px 12px", color: "var(--text-1)", fontSize: 13, marginTop: 4,
};
const primaryBtn: React.CSSProperties = {
  background: "var(--accent-gradient)", border: "none", borderRadius: 8, padding: "9px 20px",
  color: "var(--accent-ink)", fontWeight: 700, cursor: "pointer", fontSize: 13.5,
};
const secondaryBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 16px",
  color: "var(--text-2)", cursor: "pointer", fontSize: 13,
};
const smallBtn: React.CSSProperties = {
  background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 6, padding: "5px 10px",
  color: "var(--text-1)", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
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
      const res = await fetch(`/api/management/pms/${artist.artistId}/tasks`, {
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
    <div style={modalOverlay} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, width: 480, maxWidth: "95vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Nuevo pendiente para {artist.artistName}</div>

        <div>
          <div style={fieldLabel}>Título</div>
          <input style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Confirmar fecha del show" />
        </div>

        <div>
          <div style={fieldLabel}>Descripción (opcional)</div>
          <textarea style={{ ...inputStyle, minHeight: 90, fontFamily: "inherit", resize: "vertical" }} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        <div>
          <div style={fieldLabel}>Dirigir a</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
            {pmEmails.map((email) => (
              <label key={email} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={selectedPms.includes(email)} onChange={() => togglePm(email)} />
                {email}
              </label>
            ))}
          </div>
        </div>

        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button onClick={handleSubmit} disabled={sending} style={primaryBtn}>
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
    fetch(`/api/management/pms/${artistId}/tasks`)
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

function ManagementPmsInner() {
  const [pms, setPms] = useState<Pm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPm, setFilterPm] = useState("");
  const [filterArtist, setFilterArtist] = useState("");
  const [taskModal, setTaskModal] = useState<{ artistId: string; artistName: string; pmEmails: string[] } | null>(null);
  const [sentNotice, setSentNotice] = useState(false);

  useEffect(() => {
    fetch("/api/management/pm-artists").then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setPms(d.pms)));
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
    <ManagementShell title="Pendientes de PM" backHref="/panel/management">
      {error && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {sentNotice && (
        <div style={{ background: "var(--good-bg)", color: "var(--good-ink)", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          ✓ Pendiente enviado.{" "}
          <button type="button" onClick={() => setSentNotice(false)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline" }}>
            Cerrar
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filterPm} onChange={(e) => setFilterPm(e.target.value)} style={{ ...inputStyle, marginTop: 0, width: 220 }}>
          <option value="">Todos los PM</option>
          {(pms ?? []).map((pm) => <option key={pm.email} value={pm.email}>{pm.name}</option>)}
        </select>
        <select value={filterArtist} onChange={(e) => setFilterArtist(e.target.value)} style={{ ...inputStyle, marginTop: 0, width: 220 }}>
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
                <div style={{ fontWeight: 700, fontSize: 15 }}>{pm.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{pm.email}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {pm.artists.map((a) => (
                  <div key={`${pm.email}-${a.artistId}`} className="card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.artistName}</div>
                      {a.role === "collaborator" && (
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 100, background: "var(--bg-2)", color: "var(--text-3)" }}>
                          Compartido
                        </span>
                      )}
                    </div>
                    <button type="button" style={{ ...smallBtn, alignSelf: "flex-start" }} onClick={() => setTaskModal({ artistId: a.artistId, artistName: a.artistName, pmEmails: a.responsiblePms })}>
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
    </ManagementShell>
  );
}

export default function ManagementPmsPage() {
  return (
    <RequireRole allow={["admin", "management"]}>
      <ManagementPmsInner />
    </RequireRole>
  );
}
