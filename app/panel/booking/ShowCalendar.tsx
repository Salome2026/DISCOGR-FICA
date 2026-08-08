"use client";

import { useEffect, useMemo, useState } from "react";

type BookingShow = {
  id: string;
  artistName: string;
  fecha: string;
  hora: string | null;
  venue: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  lat: number | null;
  lng: number | null;
  estado: string;
  notas: string | null;
  valor: string | null;
  source: string;
};

type BookingArtist = { id: string; name: string; sello: string | null; photoUrl: string | null };

const ESTADOS_SHOW = ["Pendiente", "Confirmado", "Cerrado"] as const;
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="bkc-avatar-img" />;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return <div className="bkc-avatar-fallback">{initials || "?"}</div>;
}

export default function ShowCalendar() {
  const [shows, setShows] = useState<BookingShow[] | null>(null);
  const [artists, setArtists] = useState<BookingArtist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [editing, setEditing] = useState<BookingShow | "new" | null>(null);
  const [dayDetail, setDayDetail] = useState<string | null>(null);

  function reload() {
    fetch("/api/booking/shows")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setShows(d.shows);
      })
      .catch((e) => setError(String(e)));
  }

  // Pulls fresh cells from the team's Google Sheet (server-side rate-limited
  // to once a minute regardless of how many tabs call this) before reloading,
  // so the calendar reflects both manual edits and the live sheet.
  function syncAndReload() {
    fetch("/api/booking/sync-sheet", { method: "POST" })
      .catch(() => {})
      .finally(reload);
  }

  useEffect(() => {
    syncAndReload();
    fetch("/api/booking/artists")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setArtists(d.artists);
      })
      .catch(() => {});

    // Keeps the calendar "live" without a manual reload — a teammate's edit
    // shows up within 30s, or immediately when you switch back to this tab.
    const interval = setInterval(syncAndReload, 30000);
    function onVisible() {
      if (document.visibilityState === "visible") syncAndReload();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const photoByName = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const a of artists) m.set(normalize(a.name), a.photoUrl);
    return m;
  }, [artists]);

  const showsByDay = useMemo(() => {
    const m = new Map<string, BookingShow[]>();
    if (!shows) return m;
    for (const s of shows) {
      if (!m.has(s.fecha)) m.set(s.fecha, []);
      m.get(s.fecha)!.push(s);
    }
    return m;
  }, [shows]);

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = new Date();

  function go(delta: number) {
    setCursor((c) => {
      const d = new Date(c);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }

  return (
    <div className="card bkc-card">
      <style>{`
        .bkc-card { display: flex; flex-direction: column; height: 100%; }
        .bkc-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 1rem; }
        .bkc-title { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
        .bkc-nav { display: flex; align-items: center; gap: 6px; }
        .bkc-nav button { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; width: 30px; height: 30px; color: var(--text-2); cursor: pointer; font-size: 14px; }
        .bkc-nav button:hover { color: var(--text-1); border-color: var(--accent-color-glow); }
        .bkc-nav .today-btn { width: auto; padding: 0 12px; font-size: 12.5px; font-weight: 600; }
        .bkc-new-btn { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13px; }
        .bkc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; flex: 1; }
        .bkc-dayname { font-size: 12px; color: var(--text-2); font-weight: 600; text-align: center; padding: 2px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
        .bkc-cell { height: 92px; border-radius: 10px; border: 1px solid var(--line-soft); padding: 6px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
        .bkc-cell.outside { opacity: .35; }
        .bkc-cell.today { border-color: var(--accent-color); background: rgba(63,198,209,0.06); }
        .bkc-daynum { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .bkc-daynum-btn { background: none; border: none; padding: 0; text-align: left; cursor: pointer; }
        .bkc-daynum-btn:hover { color: var(--accent-color); text-decoration: underline; }
        .bkc-chip { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; padding: 3px 6px; border-radius: 6px; background: var(--glass-bg); cursor: pointer; border: none; color: var(--text-1); width: 100%; text-align: left; overflow: hidden; }
        .bkc-chip:hover { background: var(--glass-bg-strong); }
        .bkc-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bkc-avatar-img { width: 18px; height: 18px; border-radius: 5px; object-fit: cover; flex-shrink: 0; }
        .bkc-avatar-fallback { width: 18px; height: 18px; border-radius: 5px; background: var(--accent-gradient); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 8px; flex-shrink: 0; }
        .bkc-more { font-size: 11px; color: var(--text-2); padding: 0 5px; background: none; border: none; text-align: left; cursor: pointer; font-family: inherit; }
        .bkc-more:hover { color: var(--text-1); text-decoration: underline; }

        .bkc-day-modal { max-width: 420px; max-height: 80vh; overflow-y: auto; }
        .bkc-day-list { display: flex; flex-direction: column; gap: 8px; }
        .bkc-day-row { display: flex; align-items: center; gap: 10px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 10px; padding: .6rem .8rem; cursor: pointer; text-align: left; width: 100%; border-style: solid; color: var(--text-1); font-family: inherit; }
        .bkc-day-row:hover { background: var(--glass-bg-strong); }
        .bkc-day-row-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
        .bkc-day-row-name { font-size: 13.5px; font-weight: 700; }
        .bkc-day-row-meta { font-size: 12px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bkc-day-row-valor { flex-shrink: 0; font-size: 12.5px; font-weight: 700; color: var(--text-1); background: var(--glass-bg-strong); border-radius: 6px; padding: 3px 8px; }
        .bkc-empty { color: var(--text-3); font-size: 13.5px; padding: 1rem 0; }

        .bkc-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 2rem; overflow-y: auto; }
        .bkc-modal { background: var(--glass-bg-strong); backdrop-filter: blur(40px) saturate(1.7); -webkit-backdrop-filter: blur(40px) saturate(1.7); color: var(--text-1); border-radius: 16px; border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass-lg); width: 100%; max-width: 480px; padding: 1.6rem; display: flex; flex-direction: column; gap: 14px; }
        .bkc-modal h2 { font-size: 18px; font-weight: 700; margin: 0; }
        .bkc-field { display: flex; flex-direction: column; gap: 6px; }
        .bkc-field label { font-size: 12px; color: var(--text-3); }
        .bkc-field input, .bkc-field select, .bkc-field textarea { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 11px; color: var(--text-1); font-size: 13.5px; font-family: inherit; }
        .bkc-field-row { display: flex; gap: 10px; }
        .bkc-field-row .bkc-field { flex: 1; }
        .bkc-modal-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 4px; }
        .bkc-btn-primary { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13px; }
        .bkc-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 14px; color: var(--text-2); cursor: pointer; font-size: 13px; }
        .bkc-btn-danger { background: transparent; border: 1px solid var(--crit); border-radius: 8px; padding: 9px 14px; color: var(--crit-ink); cursor: pointer; font-size: 13px; }
      `}</style>

      <div className="bkc-header">
        <div>
          <div className="card-label">Calendario de shows</div>
          <div className="bkc-title">{MESES[cursor.getMonth()]} {cursor.getFullYear()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="bkc-nav">
            <button onClick={() => go(-1)} aria-label="Anterior">‹</button>
            <button className="today-btn" onClick={() => setCursor(new Date())}>Hoy</button>
            <button onClick={() => go(1)} aria-label="Siguiente">›</button>
          </div>
          <button className="bkc-new-btn" onClick={() => setEditing("new")}>+ Nuevo show</button>
        </div>
      </div>

      {error && <p className="bkc-empty">Error: {error}</p>}
      {shows === null && !error && <p className="bkc-empty">Cargando shows...</p>}

      {shows && (
        <div className="bkc-grid">
          {DIAS.map((d) => <div className="bkc-dayname" key={d}>{d}</div>)}
          {monthDays.map((d) => {
            const dayShows = showsByDay.get(toKey(d)) ?? [];
            const outside = d.getMonth() !== cursor.getMonth();
            const visible = dayShows.slice(0, 2);
            const extra = dayShows.length - visible.length;
            return (
              <div key={d.toISOString()} className={`bkc-cell${outside ? " outside" : ""}${isSameDay(d, today) ? " today" : ""}`}>
                {dayShows.length > 0 ? (
                  <button type="button" className="bkc-daynum bkc-daynum-btn" onClick={() => setDayDetail(toKey(d))}>{d.getDate()}</button>
                ) : (
                  <div className="bkc-daynum">{d.getDate()}</div>
                )}
                {visible.map((s) => (
                  <button key={s.id} className="bkc-chip" onClick={() => setEditing(s)}>
                    <Avatar name={s.artistName} url={photoByName.get(normalize(s.artistName)) ?? null} />
                    <span>{s.artistName}{s.ciudad ? ` · ${s.ciudad}` : s.venue ? ` · ${s.venue}` : s.notas ? ` · ${s.notas}` : ""}</span>
                  </button>
                ))}
                {extra > 0 && (
                  <button type="button" className="bkc-more" onClick={() => setDayDetail(toKey(d))}>+{extra} más</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dayDetail && (
        <DayDetailModal
          fecha={dayDetail}
          shows={showsByDay.get(dayDetail) ?? []}
          photoByName={photoByName}
          onClose={() => setDayDetail(null)}
          onSelectShow={(s) => { setDayDetail(null); setEditing(s); }}
        />
      )}

      {editing && (
        <ShowModal
          show={editing === "new" ? null : editing}
          artists={artists}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function DayDetailModal({
  fecha,
  shows,
  photoByName,
  onClose,
  onSelectShow,
}: {
  fecha: string;
  shows: BookingShow[];
  photoByName: Map<string, string | null>;
  onClose: () => void;
  onSelectShow: (show: BookingShow) => void;
}) {
  return (
    <div className="bkc-modal-overlay" onClick={onClose}>
      <div className="bkc-modal bkc-day-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</h2>
        <div className="bkc-day-list">
          {shows.map((s) => (
            <button key={s.id} className="bkc-day-row" onClick={() => onSelectShow(s)}>
              <Avatar name={s.artistName} url={photoByName.get(normalize(s.artistName)) ?? null} />
              <div className="bkc-day-row-text">
                <span className="bkc-day-row-name">{s.artistName}</span>
                <span className="bkc-day-row-meta">
                  {s.ciudad ? s.ciudad : s.venue ? s.venue : s.notas ? s.notas : "Sin detalle"}
                  {s.hora ? ` · ${s.hora} hs` : ""} · {s.estado}
                </span>
              </div>
              {s.valor && <span className="bkc-day-row-valor">{s.valor}</span>}
            </button>
          ))}
        </div>
        <div className="bkc-modal-actions">
          <span />
          <button type="button" className="bkc-btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ShowModal({
  show,
  artists,
  onClose,
  onSaved,
}: {
  show: BookingShow | null;
  artists: BookingArtist[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [artistName, setArtistName] = useState(show?.artistName ?? "");
  const [fecha, setFecha] = useState(show?.fecha ?? "");
  const [hora, setHora] = useState(show?.hora ?? "");
  const [venue, setVenue] = useState(show?.venue ?? "");
  const [ciudad, setCiudad] = useState(show?.ciudad ?? "");
  const [provincia, setProvincia] = useState(show?.provincia ?? "");
  const [pais, setPais] = useState(show?.pais ?? "");
  const [estado, setEstado] = useState(show?.estado ?? "Pendiente");
  const [notas, setNotas] = useState(show?.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (show && show.source === "sheet") {
    return (
      <SheetShowModal show={show} onClose={onClose} onSaved={onSaved} />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!artistName.trim() || !fecha) {
      setError("Artista y fecha son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = show ? `/api/booking/shows/${encodeURIComponent(show.id)}` : "/api/booking/shows";
      const res = await fetch(url, {
        method: show ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName, fecha, hora: hora || null, venue: venue || null, ciudad: ciudad || null,
          provincia: provincia || null, pais: pais || null, estado, contactoId: null, notas: notas || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!show) return;
    if (!confirm("¿Eliminar este show?")) return;
    setSaving(true);
    await fetch(`/api/booking/shows/${encodeURIComponent(show.id)}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="bkc-modal-overlay" onClick={onClose}>
      <form className="bkc-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{show ? "Editar show" : "Nuevo show"}</h2>

        <div className="bkc-field">
          <label>Artista</label>
          <input value={artistName} onChange={(e) => setArtistName(e.target.value)} list="bkc-artist-list" placeholder="Nombre del artista" />
          <datalist id="bkc-artist-list">
            {artists.map((a) => <option key={a.id} value={a.name} />)}
          </datalist>
        </div>

        <div className="bkc-field-row">
          <div className="bkc-field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="bkc-field">
            <label>Hora</label>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>

        <div className="bkc-field">
          <label>Venue</label>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Nombre del lugar" />
        </div>

        <div className="bkc-field-row">
          <div className="bkc-field">
            <label>Ciudad</label>
            <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
          </div>
          <div className="bkc-field">
            <label>Provincia</label>
            <input value={provincia} onChange={(e) => setProvincia(e.target.value)} />
          </div>
          <div className="bkc-field">
            <label>País</label>
            <input value={pais} onChange={(e) => setPais(e.target.value)} />
          </div>
        </div>

        <div className="bkc-field">
          <label>Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS_SHOW.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bkc-field">
          <label>Notas</label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
        </div>

        {error && <p style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</p>}

        <div className="bkc-modal-actions">
          {show ? (
            <button type="button" className="bkc-btn-danger" onClick={handleDelete} disabled={saving}>
              Eliminar
            </button>
          ) : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="bkc-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="bkc-btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Sheet-imported shows are read-only for artist/fecha/notas (the sheet owns
// those — a re-sync would just overwrite local edits), but the sheet has no
// ciudad/provincia/país at all, so a synced show can never get a map pin on
// its own. Ubicación is the one thing worth letting the team fill in by
// hand: the sync's upsert only ever touches artist_name/fecha/notas, so this
// survives every future re-sync untouched.
function SheetShowModal({
  show,
  onClose,
  onSaved,
}: {
  show: BookingShow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editingLocation, setEditingLocation] = useState(false);
  const [ciudad, setCiudad] = useState(show.ciudad ?? "");
  const [provincia, setProvincia] = useState(show.provincia ?? "");
  const [pais, setPais] = useState(show.pais ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/shows/${encodeURIComponent(show.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName: show.artistName,
          fecha: show.fecha,
          hora: show.hora,
          venue: show.venue,
          ciudad: ciudad || null,
          provincia: provincia || null,
          pais: pais || null,
          estado: show.estado,
          contactoId: null,
          notas: show.notas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <div className="bkc-modal-overlay" onClick={onClose}>
      <div className="bkc-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{show.artistName}</h2>
        <p style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          Importado de la planilla de Google Sheets — el artista, la fecha y el detalle se editan ahí,
          no acá. La ubicación sí se puede completar acá para que el show aparezca en el mapa.
        </p>
        <div className="bkc-field">
          <label>Fecha</label>
          <div>{new Date(show.fecha + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div className="bkc-field">
          <label>Detalle (texto de la celda)</label>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{show.notas}</div>
        </div>

        {show.valor && (
          <div className="bkc-field">
            <label>Valor (extraído automáticamente del texto)</label>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{show.valor}</div>
          </div>
        )}

        {!editingLocation ? (
          <div className="bkc-field">
            <label>Ubicación</label>
            <div style={{ fontSize: 13.5 }}>
              {show.ciudad || show.provincia || show.pais
                ? [show.ciudad, show.provincia, show.pais].filter(Boolean).join(", ")
                : <span style={{ color: "var(--text-3)" }}>Sin ubicación — no aparece en el mapa todavía.</span>}
            </div>
            <button type="button" className="bkc-btn-ghost" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => setEditingLocation(true)}>
              {show.ciudad || show.provincia || show.pais ? "Editar ubicación" : "Agregar ubicación"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveLocation} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="bkc-field-row">
              <div className="bkc-field">
                <label>Ciudad</label>
                <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
              </div>
              <div className="bkc-field">
                <label>Provincia</label>
                <input value={provincia} onChange={(e) => setProvincia(e.target.value)} />
              </div>
              <div className="bkc-field">
                <label>País</label>
                <input value={pais} onChange={(e) => setPais(e.target.value)} />
              </div>
            </div>
            {error && <p style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</p>}
            <div className="bkc-modal-actions">
              <span />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="bkc-btn-ghost" onClick={() => setEditingLocation(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="bkc-btn-primary" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar ubicación"}
                </button>
              </div>
            </div>
          </form>
        )}

        {!editingLocation && (
          <div className="bkc-modal-actions">
            <span />
            <button type="button" className="bkc-btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}
