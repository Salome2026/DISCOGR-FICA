"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

const STUDIOS = ["Sinatra", "Madonna"] as const;
const SHIFTS = ["12:00-15:00", "16:00-19:00"] as const;
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Booking = {
  id: string;
  artistId: string;
  artistName: string;
  artistPhotoUrl: string | null;
  studio: string;
  bookingDate: string;
  shift: string;
  comment: string | null;
  bookedBy: string;
  createdAt: string;
};

type ArtistOption = { id: string; name: string; photoUrl: string | null };

type Slot = { studio: string; date: string; shift: string };

const STYLES = `
  .stc-wrap { display:flex; flex-direction:column; gap:10px; }
  .stc-nav { display:flex; align-items:center; gap:10px; justify-content:space-between; }
  .stc-nav-btns { display:flex; gap:6px; }
  .stc-nav-btn { background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:8px; padding:6px 12px; color:var(--text-1); cursor:pointer; font-size:13px; }
  .stc-range { font-size:14px; font-weight:700; color:var(--text-1); }
  .stc-grid { display:grid; grid-template-columns: 130px repeat(7, 1fr); gap:6px; overflow-x:auto; }
  .stc-head { font-size:11.5px; color:var(--text-3); text-align:center; padding:6px 4px; text-transform:uppercase; letter-spacing:.03em; }
  .stc-row-label { font-size:12px; color:var(--text-2); font-weight:600; display:flex; align-items:center; padding:4px; }
  .stc-cell { min-height:64px; border-radius:8px; border:1px solid var(--line-soft); padding:6px; cursor:pointer; display:flex; flex-direction:column; justify-content:center; }
  .stc-cell.available { background:var(--bg-2); color:var(--text-3); font-size:11.5px; align-items:center; justify-content:center; }
  .stc-cell.available:hover { border-color:var(--accent); color:var(--text-2); }
  .stc-cell.booked { background:var(--accent-glass-bg); border-color:var(--accent-glass-border); gap:2px; }
  .stc-cell.booked:hover { border-color:var(--accent); }
  .stc-booking-artist { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--text-1); }
  .stc-avatar { width:20px; height:20px; border-radius:50%; object-fit:cover; flex-shrink:0; }
  .stc-avatar-fallback { width:20px; height:20px; border-radius:50%; background:var(--bg-2); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:var(--text-2); flex-shrink:0; }
  .stc-booking-meta { font-size:10.5px; color:var(--text-3); }
`;

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="stc-avatar" />;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return <div className="stc-avatar-fallback">{initials || "?"}</div>;
}

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
// Self-contained glass-card styling (same tokens as .pmx-card/.card) — this
// component is shared between the PM shell and the Management shell, whose
// card classes aren't interchangeable, so it never depends on either.
const cardStyle: React.CSSProperties = {
  background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)",
  padding: "1.5rem", boxShadow: "var(--shadow-glass)",
};

function CreateModal({
  slot, artistOptions, onClose, onCreated,
}: { slot: Slot; artistOptions: ArtistOption[]; onClose: () => void; onCreated: () => void }) {
  const [artistId, setArtistId] = useState(artistOptions[0]?.id ?? "");
  const [studio, setStudio] = useState(slot.studio);
  const [date, setDate] = useState(slot.date);
  const [shift, setShift] = useState(slot.shift);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    const artist = artistOptions.find((a) => a.id === artistId);
    if (!artist) {
      setError("Elegí un artista.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/studio-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artist.id, artistName: artist.name, studio, bookingDate: date, shift, comment: comment.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo reservar.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12, width: 420, maxWidth: "95vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Reservar estudio</div>
        {artistOptions.length === 0 ? (
          <p style={{ color: "var(--crit-ink)", fontSize: 13 }}>No tenés artistas asignados — pedile a Management que te asigne uno.</p>
        ) : (
          <>
            <div>
              <div style={fieldLabel}>Artista</div>
              <select value={artistId} onChange={(e) => setArtistId(e.target.value)} style={fieldInput}>
                {artistOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Estudio</div>
                <select value={studio} onChange={(e) => setStudio(e.target.value)} style={fieldInput}>
                  {STUDIOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Turno</div>
                <select value={shift} onChange={(e) => setShift(e.target.value)} style={fieldInput}>
                  {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Fecha</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Comentario u objetivo de la sesión (opcional)</div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} style={{ ...fieldInput, minHeight: 70, fontFamily: "inherit", resize: "vertical" }} />
            </div>
          </>
        )}
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
          {artistOptions.length > 0 && (
            <button onClick={confirm} disabled={saving} style={primaryBtn}>{saving ? "Reservando..." : "Confirmar reserva"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailModal({
  booking, canManage, onClose, onChanged,
}: { booking: Booking; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const [studio, setStudio] = useState(booking.studio);
  const [date, setDate] = useState(booking.bookingDate.slice(0, 10));
  const [shift, setShift] = useState(booking.shift);
  const [comment, setComment] = useState(booking.comment ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio-bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio, bookingDate: date, shift, comment: comment.trim() || null }),
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

  async function confirmCancel() {
    if (!cancelReason.trim()) {
      setError("Hay que indicar el motivo para cancelar la reserva.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio-bookings/${booking.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo cancelar.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12, width: 440, maxWidth: "95vw" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={booking.artistName} url={booking.artistPhotoUrl} />
          <div style={{ fontSize: 16, fontWeight: 700 }}>{booking.artistName}</div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Reservado por {booking.bookedBy}</div>

        {!canManage ? (
          <>
            <div style={{ fontSize: 13.5 }}>{booking.studio} · {booking.shift} · {booking.bookingDate.slice(0, 10)}</div>
            {booking.comment && <div style={{ fontSize: 13, color: "var(--text-3)" }}>{booking.comment}</div>}
          </>
        ) : !showCancel ? (
          <>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Estudio</div>
                <select value={studio} onChange={(e) => setStudio(e.target.value)} style={fieldInput}>
                  {STUDIOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={fieldLabel}>Turno</div>
                <select value={shift} onChange={(e) => setShift(e.target.value)} style={fieldInput}>
                  {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Fecha</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldInput} />
            </div>
            <div>
              <div style={fieldLabel}>Comentario</div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} style={{ ...fieldInput, minHeight: 60, fontFamily: "inherit", resize: "vertical" }} />
            </div>
            {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <button onClick={() => setShowCancel(true)} style={{ ...secondaryBtn, color: "var(--crit-ink)", borderColor: "var(--crit-ink)" }}>
                Cancelar reserva
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={secondaryBtn}>Cerrar</button>
                <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div style={fieldLabel}>Motivo de la cancelación (obligatorio)</div>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ ...fieldInput, minHeight: 60, fontFamily: "inherit", resize: "vertical" }} />
            </div>
            {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowCancel(false)} style={secondaryBtn}>Volver</button>
              <button onClick={confirmCancel} disabled={saving} style={{ ...primaryBtn, background: "var(--crit-bg)", color: "var(--crit-ink)" }}>
                {saving ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StudioCalendar({ mode }: { mode: "pm" | "management" }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [artistOptions, setArtistOptions] = useState<ArtistOption[]>([]);
  const [createSlot, setCreateSlot] = useState<Slot | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

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

  function loadBookings() {
    fetch(`/api/studio-bookings?start=${toKey(weekStart)}&end=${toKey(weekEnd)}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []));
  }

  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadBookings();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    const url = mode === "pm" ? "/api/pm/artistas" : "/api/management/artists";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const list = mode === "pm"
          ? (d.artists ?? []).map((a: { artistId: string; artistName: string; photoUrl: string | null }) => ({ id: a.artistId, name: a.artistName, photoUrl: a.photoUrl }))
          : (d.artists ?? []).map((a: { id: string; name: string; photoUrl: string | null }) => ({ id: a.id, name: a.name, photoUrl: a.photoUrl }));
        setArtistOptions(list);
      });
  }, [mode]);

  function canManage(booking: Booking): boolean {
    if (mode === "management") return true;
    return artistOptions.some((a) => a.id === booking.artistId);
  }

  const byCell = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookings ?? []) map.set(`${b.studio}|${b.bookingDate.slice(0, 10)}|${b.shift}`, b);
    return map;
  }, [bookings]);

  return (
    <div className="stc-wrap">
      <style>{STYLES}</style>
      <div className="stc-nav">
        <div className="stc-range">{formatShort(weekStart)} – {formatShort(weekEnd)}</div>
        <div className="stc-nav-btns">
          <button className="stc-nav-btn" onClick={() => setWeekOffset((w) => w - 1)}>‹</button>
          <button className="stc-nav-btn" onClick={() => setWeekOffset(0)}>Hoy</button>
          <button className="stc-nav-btn" onClick={() => setWeekOffset((w) => w + 1)}>›</button>
        </div>
      </div>

      <div className="stc-grid">
        <div />
        {days.map((d, i) => (
          <div key={i} className="stc-head">{DIAS[i]} {formatShort(d)}</div>
        ))}

        {STUDIOS.map((studio) =>
          SHIFTS.map((shift) => (
            <Fragment key={`${studio}-${shift}`}>
              <div className="stc-row-label">{studio}<br />{shift}</div>
              {days.map((d) => {
                const dateKey = toKey(d);
                const booking = byCell.get(`${studio}|${dateKey}|${shift}`);
                return (
                  <div
                    key={`${studio}-${shift}-${dateKey}`}
                    className={`stc-cell ${booking ? "booked" : "available"}`}
                    onClick={() => (booking ? setDetailBooking(booking) : setCreateSlot({ studio, date: dateKey, shift }))}
                  >
                    {booking ? (
                      <>
                        <div className="stc-booking-artist">
                          <Avatar name={booking.artistName} url={booking.artistPhotoUrl} />
                          {booking.artistName}
                        </div>
                        <div className="stc-booking-meta">{booking.studio} · {booking.shift}</div>
                        <div className="stc-booking-meta">{booking.bookedBy}</div>
                      </>
                    ) : (
                      "Disponible"
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))
        )}
      </div>

      {createSlot && (
        <CreateModal
          slot={createSlot}
          artistOptions={artistOptions}
          onClose={() => setCreateSlot(null)}
          onCreated={() => {
            setCreateSlot(null);
            loadBookings();
          }}
        />
      )}
      {detailBooking && (
        <DetailModal
          booking={detailBooking}
          canManage={canManage(detailBooking)}
          onClose={() => setDetailBooking(null)}
          onChanged={() => {
            setDetailBooking(null);
            loadBookings();
          }}
        />
      )}
    </div>
  );
}
