"use client";

import { useEffect, useMemo, useState } from "react";

type BookingShow = {
  id: string;
  artistName: string;
  fecha: string;
  hora: string | null;
  venue: string | null;
  ciudad: string | null;
  estado: string;
};

type BookingArtist = { id: string; name: string; sello: string | null; photoUrl: string | null };

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function lastOfMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="bkag-avatar-img" />;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return <div className="bkag-avatar-fallback">{initials || "?"}</div>;
}

export default function ArtistAgenda() {
  const [shows, setShows] = useState<BookingShow[] | null>(null);
  const [artists, setArtists] = useState<BookingArtist[]>([]);
  const [artistName, setArtistName] = useState("");
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(lastOfMonth());

  useEffect(() => {
    fetch("/api/booking/shows").then((r) => r.json()).then((d) => { if (!d.error) setShows(d.shows); }).catch(() => {});
    fetch("/api/booking/artists").then((r) => r.json()).then((d) => { if (!d.error) setArtists(d.artists); }).catch(() => {});
  }, []);

  const selectedArtist = artists.find((a) => normalize(a.name) === normalize(artistName)) ?? null;

  const showsInRange = useMemo(() => {
    if (!shows || !artistName) return [];
    const key = normalize(artistName);
    return shows
      .filter((s) => normalize(s.artistName) === key && s.fecha >= desde && s.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [shows, artistName, desde, hasta]);

  const totalDiasRango = useMemo(() => {
    const d1 = new Date(desde + "T00:00:00");
    const d2 = new Date(hasta + "T00:00:00");
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
  }, [desde, hasta]);

  return (
    <div className="card bkg-section" style={{ marginBottom: 0 }}>
      <style>{`
        .bkag-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 1rem; }
        .bkag-title { font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
        .bkag-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; }
        .bkag-controls input, .bkag-controls select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 12px; color: var(--text-1); font-size: 13.5px; font-family: inherit; }
        .bkag-artist-select { min-width: 220px; }
        .bkag-summary { display: flex; align-items: center; gap: 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1rem 1.2rem; margin-bottom: 1rem; }
        .bkag-avatar-img { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
        .bkag-avatar-fallback { width: 44px; height: 44px; border-radius: 12px; background: var(--accent-gradient); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
        .bkag-summary-text { font-size: 13.5px; color: var(--text-2); }
        .bkag-summary-text strong { color: var(--text-1); font-size: 15px; }
        .bkag-list { display: flex; flex-direction: column; gap: 8px; }
        .bkag-row { display: flex; align-items: center; gap: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 10px; padding: .7rem 1rem; font-size: 13px; }
        .bkag-row .fecha { font-weight: 700; min-width: 90px; }
        .bkag-row .meta { color: var(--text-2); }
        .bkag-empty { color: var(--text-3); font-size: 13.5px; padding: 1rem 0; text-align: center; }
      `}</style>

      <div className="bkag-header">
        <div>
          <div className="card-label">Agenda por artista</div>
          <div className="bkag-title">Disponibilidad</div>
        </div>
      </div>

      <div className="bkag-controls">
        <input
          className="bkag-artist-select"
          list="bkag-artist-list"
          placeholder="Elegí un artista..."
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
        />
        <datalist id="bkag-artist-list">
          {artists.map((a) => <option key={a.id} value={a.name} />)}
        </datalist>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <span style={{ color: "var(--text-3)" }}>a</span>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>

      {!artistName && <p className="bkag-empty">Elegí un artista para ver su agenda.</p>}

      {artistName && shows && (
        <>
          <div className="bkag-summary">
            <Avatar name={artistName} url={selectedArtist?.photoUrl ?? null} />
            <div className="bkag-summary-text">
              <strong>{showsInRange.length}</strong> show{showsInRange.length === 1 ? "" : "s"} en el período
              {" · "}{totalDiasRango - showsInRange.length} de {totalDiasRango} días libres
            </div>
          </div>

          {showsInRange.length === 0 ? (
            <p className="bkag-empty">Sin shows programados en este rango — disponible todo el período.</p>
          ) : (
            <div className="bkag-list">
              {showsInRange.map((s) => (
                <div key={s.id} className="bkag-row">
                  <span className="fecha">{new Date(s.fecha + "T00:00:00").toLocaleDateString("es-AR")}</span>
                  <span className="meta">
                    {s.venue ?? "Sin venue"}{s.ciudad ? ` · ${s.ciudad}` : ""}{s.hora ? ` · ${s.hora} hs` : ""} · {s.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
