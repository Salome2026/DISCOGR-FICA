"use client";

import { useEffect, useState } from "react";

type MeetingRequest = {
  id: string; artistId: string; artistName: string; requestedBy: string; comment: string;
  priority: string; suggestedDate: string | null; status: string;
  scheduledDate: string | null; scheduledTime: string | null; managementNotes: string | null;
  createdAt: string;
};

const STATUSES = ["Pendiente", "Agendada", "Realizada"];
const STATUS_TONE: Record<string, string> = { Pendiente: "var(--warn-ink)", Agendada: "var(--accent)", Realizada: "var(--good-ink)" };

function formatFecha(fecha: string | null): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function ResponseModal({ request, onClose, onSaved }: { request: MeetingRequest; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(request.status);
  const [scheduledDate, setScheduledDate] = useState(request.scheduledDate?.slice(0, 10) ?? "");
  const [scheduledTime, setScheduledTime] = useState(request.scheduledTime ?? "");
  const [notes, setNotes] = useState(request.managementNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/management/meeting-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          scheduledDate: scheduledDate || null,
          scheduledTime: scheduledTime || null,
          managementNotes: notes || null,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, width: 460, maxWidth: "95vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{request.artistName}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          Solicitada por {request.requestedBy} · Prioridad {request.priority}
        </div>
        <div style={{ fontSize: 13.5, background: "var(--bg-2)", borderRadius: 8, padding: "10px 12px" }}>{request.comment}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Fecha</div>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", color: "var(--text-1)", fontSize: 13, marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Horario</div>
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", color: "var(--text-1)", fontSize: 13, marginTop: 4 }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Estado</div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", color: "var(--text-1)", fontSize: 13, marginTop: 4 }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Anotaciones</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", minHeight: 70, background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "10px 12px", color: "var(--text-1)", fontSize: 13, marginTop: 4, fontFamily: "inherit", resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving} style={{ background: "var(--accent-gradient)", border: "none", borderRadius: 8, padding: "9px 20px", color: "var(--accent-ink)", fontWeight: 700, cursor: "pointer", fontSize: 13.5 }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingMeetingRequests() {
  const [requests, setRequests] = useState<MeetingRequest[] | null>(null);
  const [openRequest, setOpenRequest] = useState<MeetingRequest | null>(null);

  function load() {
    fetch("/api/management/meeting-requests")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []));
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
  }, []);

  return (
    <div className="mgmt-section">
      <div className="mgmt-section-label">Reuniones de proyectos pendientes</div>
      {requests && requests.length === 0 && (
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>No hay solicitudes de reunión por ahora.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {requests?.map((r) => (
          <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, fontWeight: 700 }}>
                {r.artistName}
                <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_TONE[r.status] ?? "var(--text-1)" }}>{r.status}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                {r.requestedBy} · Prioridad {r.priority} · Solicitada {new Date(r.createdAt).toLocaleDateString("es-AR")}
                {r.suggestedDate && ` · Sugerida ${formatFecha(r.suggestedDate)}`}
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{r.comment}</div>
            </div>
            <button
              onClick={() => setOpenRequest(r)}
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}
            >
              Abrir
            </button>
          </div>
        ))}
      </div>
      {openRequest && (
        <ResponseModal
          request={openRequest}
          onClose={() => setOpenRequest(null)}
          onSaved={() => {
            setOpenRequest(null);
            load();
          }}
        />
      )}
    </div>
  );
}
