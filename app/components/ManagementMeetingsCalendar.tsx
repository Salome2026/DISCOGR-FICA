"use client";

import { useEffect, useMemo, useState } from "react";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MODALIDADES = ["Presencial", "Virtual"] as const;
const STATUSES = ["Pendiente", "Agendada", "Realizada", "Cancelada"] as const;
// Vocabulario que pidió la clienta para el calendario — los valores reales
// guardados en la base (Pendiente/Agendada/Realizada/Cancelada) no cambian,
// esto es solo la etiqueta que se muestra acá.
const STATUS_LABELS: Record<string, string> = {
  Pendiente: "Solicitada",
  Agendada: "Confirmada",
  Realizada: "Realizada",
  Cancelada: "Cancelada",
};
const STATUS_TONE: Record<string, string> = {
  Pendiente: "var(--warn-ink)",
  Agendada: "var(--accent)",
  Realizada: "var(--good-ink)",
  Cancelada: "var(--crit-ink)",
};

type Meeting = {
  id: string;
  artistId: string;
  artistName: string;
  requestedBy: string;
  comment: string;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  suggestedDate: string | null;
  participantes: string | null;
  modalidad: string | null;
  direccionOLink: string | null;
  createdAt: string;
};

type ArtistOption = { id: string; name: string };
type PmOption = { email: string; name: string };

const STYLES = `
  .mmc-wrap { display:flex; flex-direction:column; gap:10px; }
  .mmc-nav { display:flex; align-items:center; gap:10px; justify-content:space-between; flex-wrap:wrap; }
  .mmc-nav-btns { display:flex; gap:6px; }
  .mmc-nav-btn { background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:8px; padding:6px 12px; color:var(--text-1); cursor:pointer; font-size:13px; }
  .mmc-range { font-size:14px; font-weight:700; color:var(--text-1); }
  .mmc-actions { display:flex; gap:8px; }
  .mmc-action-btn { background:var(--accent-glass-bg); border:1px solid var(--accent-glass-border); border-radius:8px; padding:7px 14px; color:var(--text-1); cursor:pointer; font-size:12.5px; font-weight:600; }
  .mmc-grid { display:grid; grid-template-columns: repeat(7, minmax(150px,1fr)); gap:8px; overflow-x:auto; align-items:start; }
  .mmc-head { font-size:11.5px; color:var(--text-3); text-align:center; padding:6px 4px; text-transform:uppercase; letter-spacing:.03em; }
  .mmc-col { display:flex; flex-direction:column; gap:6px; min-height:80px; border-radius:8px; border:1px solid var(--line-soft); background:var(--bg-2); padding:6px; }
  .mmc-card { background:var(--accent-glass-bg); border:1px solid var(--accent-glass-border); border-radius:8px; padding:8px; cursor:pointer; display:flex; flex-direction:column; gap:2px; }
  .mmc-card:hover { border-color:var(--accent); }
  .mmc-card-time { font-size:11px; font-weight:700; color:var(--text-1); }
  .mmc-card-artist { font-size:12.5px; font-weight:700; color:var(--text-1); }
  .mmc-card-status { font-size:10.5px; font-weight:700; }
  .mmc-empty { font-size:11px; color:var(--text-3); text-align:center; padding:8px 2px; }
`;

const modalOverlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
};
const fieldLabel: React.CSSProperties = { fontSize: 12.5, color: "var(--text-2)" };
const fieldInput: React.CSSProperties = {
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
const modalPanelStyle: React.CSSProperties = {
  background: "var(--bg-1)", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-lg)",
  padding: "1.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  const r = new Date(d);
  r.setDate(d.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}
function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function AppleCalendarLinkModal({ onClose }: { onClose: () => void }) {
  const [links, setLinks] = useState<{ httpsUrl: string; webcalUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/management-meetings/feed-link", { method: "POST" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "No se pudo generar el enlace.");
        setLinks(d);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error desconocido."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function revoke() {
    if (!confirm("¿Revocar el acceso? El enlace actual dejará de funcionar en Apple Calendar y vas a tener que vincularte de nuevo.")) return;
    setRevoking(true);
    try {
      await fetch("/api/management-meetings/feed-link", { method: "DELETE" });
      load();
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanelStyle, display: "flex", flexDirection: "column", gap: 12, width: 480, maxWidth: "95vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Vincular con Apple Calendar</div>
        <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: 0 }}>
          Esto crea un enlace privado y revocable para suscribirte desde Apple Calendar — nunca pedimos tu correo ni tu contraseña de iCloud. Las reuniones se actualizan solas cuando se crean, editan o cancelan desde acá.
        </p>
        {loading && <div style={{ fontSize: 13, color: "var(--text-3)" }}>Generando enlace...</div>}
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
        {links && (
          <>
            <a
              href={links.webcalUrl}
              style={{ ...primaryBtn, textAlign: "center", textDecoration: "none", display: "block" }}
            >
              Suscribirme en Apple Calendar
            </a>
            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              Este botón funciona mejor abierto directamente desde Safari en el mismo iPhone/Mac donde querés que aparezcan las reuniones. Si lo mandás por WhatsApp o Mensajes a otro dispositivo, a veces el enlace <code>webcal://</code> no abre — en ese caso usá el método manual de abajo, que siempre funciona.
            </div>
            <div>
              <div style={fieldLabel}>Enlace alternativo (https)</div>
              <input readOnly value={links.httpsUrl} onFocus={(e) => e.target.select()} style={fieldInput} />
            </div>
            <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
              <strong>Para agregarlo a mano en el iPhone (100% confiable):</strong>
              <br />
              1. Copiá el enlace de arriba (enfocá el campo y copiá todo el texto).
              <br />
              2. Abrí <strong>Ajustes → Calendario → Cuentas → Agregar cuenta → Otra → Agregar calendario suscrito</strong>.
              <br />
              3. Pegá el enlace y guardá.
            </div>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          {links && (
            <button onClick={revoke} disabled={revoking} style={{ ...secondaryBtn, color: "var(--crit-ink)", borderColor: "var(--crit-ink)" }}>
              {revoking ? "Revocando..." : "Revocar acceso"}
            </button>
          )}
          <button onClick={onClose} style={secondaryBtn}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function CreateModal({
  date, artistOptions, pmOptions, onClose, onCreated,
}: { date: string; artistOptions: ArtistOption[]; pmOptions: PmOption[]; onClose: () => void; onCreated: () => void }) {
  const [artistName, setArtistName] = useState("");
  const [pmEmail, setPmEmail] = useState(pmOptions[0]?.email ?? "");
  const [scheduledDate, setScheduledDate] = useState(date);
  const [scheduledTime, setScheduledTime] = useState("");
  const [participantes, setParticipantes] = useState("");
  const [modalidad, setModalidad] = useState<string>(MODALIDADES[0]);
  const [direccionOLink, setDireccionOLink] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!artistName.trim() || !pmEmail || !comment.trim() || !scheduledDate) {
      setError("Completá artista, PM responsable, fecha y temario.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Puede ser un artista ya cargado (matchea por nombre en el servidor)
      // o un nombre escrito a mano — en ese caso el servidor arma un id
      // propio para la reunión, sin necesidad de que el artista ya exista.
      const known = artistOptions.find((a) => a.name.trim().toLowerCase() === artistName.trim().toLowerCase());
      const res = await fetch("/api/management-meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: known?.id ?? null,
          artistName: artistName.trim(),
          pmEmail,
          comment: comment.trim(),
          scheduledDate,
          scheduledTime: scheduledTime || null,
          participantes: participantes.trim() || null,
          modalidad,
          direccionOLink: direccionOLink.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo crear la reunión.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanelStyle, display: "flex", flexDirection: "column", gap: 12, width: 460, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Nueva reunión de Management</div>
        <div>
          <div style={fieldLabel}>Artista o proyecto</div>
          <input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Elegí uno existente o escribí un nombre nuevo"
            list="mmc-artist-options"
            style={fieldInput}
          />
          <datalist id="mmc-artist-options">
            {artistOptions.map((a) => <option key={a.id} value={a.name} />)}
          </datalist>
        </div>
        <div>
          <div style={fieldLabel}>PM responsable</div>
          <select value={pmEmail} onChange={(e) => setPmEmail(e.target.value)} style={fieldInput}>
            {pmOptions.map((p) => <option key={p.email} value={p.email}>{p.name || p.email}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={fieldLabel}>Fecha</div>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={fieldInput} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={fieldLabel}>Horario (opcional)</div>
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} style={fieldInput} />
          </div>
        </div>
        <div>
          <div style={fieldLabel}>Participantes</div>
          <input value={participantes} onChange={(e) => setParticipantes(e.target.value)} placeholder="Nombres de quienes participan" style={fieldInput} />
        </div>
        <div>
          <div style={fieldLabel}>Modalidad</div>
          <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} style={fieldInput}>
            {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>Dirección o enlace de videollamada</div>
          <input value={direccionOLink} onChange={(e) => setDireccionOLink(e.target.value)} style={fieldInput} />
        </div>
        <div>
          <div style={fieldLabel}>Temario o motivo</div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} style={{ ...fieldInput, minHeight: 70, fontFamily: "inherit", resize: "vertical" }} />
        </div>
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? "Creando..." : "Crear reunión"}</button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({
  meeting, canManage, onClose, onChanged,
}: { meeting: Meeting; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const [scheduledDate, setScheduledDate] = useState(meeting.scheduledDate?.slice(0, 10) ?? "");
  const [scheduledTime, setScheduledTime] = useState(meeting.scheduledTime ?? "");
  const [participantes, setParticipantes] = useState(meeting.participantes ?? "");
  const [modalidad, setModalidad] = useState(meeting.modalidad ?? MODALIDADES[0]);
  const [direccionOLink, setDireccionOLink] = useState(meeting.direccionOLink ?? "");
  const [comment, setComment] = useState(meeting.comment);
  const [status, setStatus] = useState(meeting.status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm(`¿Eliminar la reunión con ${meeting.artistName}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/management-meetings/${meeting.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo eliminar.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setDeleting(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/management-meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          scheduledDate: scheduledDate || null,
          scheduledTime: scheduledTime || null,
          participantes: participantes.trim() || null,
          modalidad,
          direccionOLink: direccionOLink.trim() || null,
          comment: comment.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo guardar.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanelStyle, display: "flex", flexDirection: "column", gap: 12, width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{meeting.artistName}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>PM: {meeting.requestedBy}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_TONE[meeting.status] ?? "var(--text-1)" }}>
            {STATUS_LABELS[meeting.status] ?? meeting.status}
          </span>
        </div>

        {!canManage ? (
          <>
            <div style={{ fontSize: 13.5 }}>
              {meeting.scheduledDate?.slice(0, 10)} {meeting.scheduledTime ? `· ${meeting.scheduledTime}` : ""}
            </div>
            {meeting.modalidad && <div style={{ fontSize: 13, color: "var(--text-3)" }}>Modalidad: {meeting.modalidad}</div>}
            {meeting.direccionOLink && <div style={{ fontSize: 13, color: "var(--text-3)" }}>{meeting.direccionOLink}</div>}
            {meeting.participantes && <div style={{ fontSize: 13, color: "var(--text-3)" }}>Participantes: {meeting.participantes}</div>}
            <div style={{ fontSize: 13, background: "var(--bg-2)", borderRadius: 8, padding: "10px 12px" }}>{meeting.comment}</div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Fecha</div>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={fieldInput} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Horario</div>
                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} style={fieldInput} />
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Participantes</div>
              <input value={participantes} onChange={(e) => setParticipantes(e.target.value)} style={fieldInput} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Modalidad</div>
                <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} style={fieldInput}>
                  {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Estado</div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldInput}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Dirección o enlace de videollamada</div>
              <input value={direccionOLink} onChange={(e) => setDireccionOLink(e.target.value)} style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Temario o motivo</div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} style={{ ...fieldInput, minHeight: 70, fontFamily: "inherit", resize: "vertical" }} />
            </div>
            {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={`/api/management-meetings/${meeting.id}/ics`} style={{ ...secondaryBtn, textDecoration: "none", display: "inline-block" }}>
              Agregar a Apple Calendar
            </a>
            {canManage && (
              <button onClick={remove} disabled={deleting} style={{ ...secondaryBtn, color: "var(--crit-ink)", borderColor: "var(--crit-ink)" }}>
                {deleting ? "Eliminando..." : "Eliminar reunión"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={secondaryBtn}>Cerrar</button>
            {canManage && (
              <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? "Guardando..." : "Guardar cambios"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagementMeetingsCalendar({ mode }: { mode: "pm" | "management" }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [artistOptions, setArtistOptions] = useState<ArtistOption[]>([]);
  const [pmOptions, setPmOptions] = useState<PmOption[]>([]);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [showAppleLink, setShowAppleLink] = useState(false);

  const canManage = mode === "management";

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  }), [weekStart]);
  const weekEnd = days[6];

  function loadMeetings() {
    fetch(`/api/management-meetings?start=${toKey(weekStart)}&end=${toKey(weekEnd)}`)
      .then((r) => r.json())
      .then((d) => setMeetings(d.meetings ?? []));
  }

  useEffect(() => {
    loadMeetings();
    const interval = setInterval(loadMeetings, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadMeetings();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/management/artists")
      .then((r) => r.json())
      .then((d) => setArtistOptions((d.artists ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))));
    fetch("/api/management/pms")
      .then((r) => r.json())
      .then((d) => setPmOptions(d.pms ?? []));
  }, [canManage]);

  const byDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings ?? []) {
      const key = (m.scheduledDate ?? m.suggestedDate ?? "").slice(0, 10);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.scheduledTime ?? "99:99").localeCompare(b.scheduledTime ?? "99:99"));
    }
    return map;
  }, [meetings]);

  return (
    <div className="mmc-wrap">
      <style>{STYLES}</style>
      <div className="mmc-nav">
        <div className="mmc-range">{formatShort(weekStart)} – {formatShort(weekEnd)}</div>
        <div className="mmc-actions">
          <button className="mmc-action-btn" onClick={() => setShowAppleLink(true)}>Vincular con Apple Calendar</button>
          {canManage && (
            <button className="mmc-action-btn" onClick={() => setCreateDate(toKey(new Date()))}>+ Nueva reunión</button>
          )}
        </div>
        <div className="mmc-nav-btns">
          <button className="mmc-nav-btn" onClick={() => setWeekOffset((w) => w - 1)}>‹</button>
          <button className="mmc-nav-btn" onClick={() => setWeekOffset(0)}>Esta semana</button>
          <button className="mmc-nav-btn" onClick={() => setWeekOffset((w) => w + 1)}>›</button>
        </div>
      </div>

      <div className="mmc-grid">
        {days.map((d, i) => (
          <div key={i} className="mmc-head">{DIAS[i]} {formatShort(d)}</div>
        ))}
        {days.map((d) => {
          const dateKey = toKey(d);
          const dayMeetings = byDay.get(dateKey) ?? [];
          return (
            <div
              key={dateKey}
              className="mmc-col"
              onClick={() => canManage && dayMeetings.length === 0 && setCreateDate(dateKey)}
              style={{ cursor: canManage ? "pointer" : "default" }}
            >
              {dayMeetings.length === 0 ? (
                <div className="mmc-empty">{canManage ? "+ agregar" : "Sin reuniones"}</div>
              ) : (
                dayMeetings.map((m) => (
                  <div key={m.id} className="mmc-card" onClick={(e) => { e.stopPropagation(); setDetailMeeting(m); }}>
                    <div className="mmc-card-time">{m.scheduledTime ?? "Sin horario"}</div>
                    <div className="mmc-card-artist">{m.artistName}</div>
                    <div className="mmc-card-status" style={{ color: STATUS_TONE[m.status] ?? "var(--text-1)" }}>
                      {STATUS_LABELS[m.status] ?? m.status}
                    </div>
                  </div>
                ))
              )}
              {canManage && dayMeetings.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCreateDate(dateKey); }}
                  style={{ background: "transparent", border: "1px dashed var(--line-soft)", borderRadius: 6, padding: "4px 6px", color: "var(--text-3)", fontSize: 10.5, cursor: "pointer" }}
                >
                  + agregar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {createDate && (
        <CreateModal
          date={createDate}
          artistOptions={artistOptions}
          pmOptions={pmOptions}
          onClose={() => setCreateDate(null)}
          onCreated={() => {
            setCreateDate(null);
            loadMeetings();
          }}
        />
      )}
      {detailMeeting && (
        <DetailModal
          meeting={detailMeeting}
          canManage={canManage}
          onClose={() => setDetailMeeting(null)}
          onChanged={() => {
            setDetailMeeting(null);
            loadMeetings();
          }}
        />
      )}
      {showAppleLink && <AppleCalendarLinkModal onClose={() => setShowAppleLink(false)} />}
    </div>
  );
}
