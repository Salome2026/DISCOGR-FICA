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

  function reload() {
    fetch("/api/booking/shows")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setShows(d.shows);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(() => {
    reload();
    fetch("/api/booking/artists")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setArtists(d.artists);
      })
      .catch(() => {});
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
        .bkc-cell { min-height: 90px; border-radius: 10px; border: 1px solid var(--line-soft); padding: 6px; display: flex; flex-direction: column; gap: 4px; }
        .bkc-cell.outside { opacity: .35; }
        .bkc-cell.today { border-color: var(--accent-color); background: rgba(63,198,209,0.06); }
        .bkc-daynum { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .bkc-chip { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; padding: 3px 6px; border-radius: 6px; background: var(--glass-bg); cursor: pointer; border: none; color: var(--text-1); width: 100%; text-align: left; overflow: hidden; }
        .bkc-chip:hover { background: var(--glass-bg-strong); }
        .bkc-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bkc-avatar-img { width: 18px; height: 18px; border-radius: 5px; object-fit: cover; flex-shrink: 0; }
        .bkc-avatar-fallback { width: 18px; height: 18px; border-radius: 5px; background: var(--accent-gradient); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 8px; flex-shrink: 0; }
        .bkc-more { font-size: 11px; color: var(--text-2); padding: 0 5px; }
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
            const visible = dayShows.slice(0, 3);
            const extra = dayShows.length - visible.length;
            return (
              <div key={d.toISOString()} className={`bkc-cell${outside ? " outside" : ""}${isSameDay(d, today) ? " today" : ""}`}>
                <div className="bkc-daynum">{d.getDate()}</div>
                {visible.map((s) => (
                  <button key={s.id} className="bkc-chip" onClick={() => setEditing(s)}>
                    <Avatar name={s.artistName} url={photoByName.get(normalize(s.artistName)) ?? null} />
                    <span>{s.artistName}{s.ciudad ? ` · ${s.ciudad}` : ""}</span>
                  </button>
                ))}
                {extra > 0 && <div className="bkc-more">+{extra} más</div>}
              </div>
            );
          })}
        </div>
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
  const [pais, setPais] = useState(show?.pais ?? "Argentina");
  const [estado, setEstado] = useState(show?.estado ?? "Pendiente");
  const [notas, setNotas] = useState(show?.notas ?? "");
  const [latOverride, setLatOverride] = useState(show?.lat != null ? String(show.lat) : "");
  const [lngOverride, setLngOverride] = useState(show?.lng != null ? String(show.lng) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const manualCoords =
        latOverride.trim() && lngOverride.trim()
          ? { lat: parseFloat(latOverride), lng: parseFloat(lngOverride) }
          : {};
      const res = await fetch(url, {
        method: show ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName, fecha, hora: hora || null, venue: venue || null, ciudad: ciudad || null,
          provincia: provincia || null, pais: pais || null, estado, contactoId: null, notas: notas || null,
          ...manualCoords,
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

        <div className="bkc-field-row">
          <div className="bkc-field">
            <label>Latitud (manual, opcional)</label>
            <input value={latOverride} onChange={(e) => setLatOverride(e.target.value)} placeholder="Se ubica automático si lo dejás vacío" />
          </div>
          <div className="bkc-field">
            <label>Longitud (manual, opcional)</label>
            <input value={lngOverride} onChange={(e) => setLngOverride(e.target.value)} placeholder="Se ubica automático si lo dejás vacío" />
          </div>
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
