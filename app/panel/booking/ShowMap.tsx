"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// The calendar next to this map loads its shows asynchronously and grows
// once they arrive, which resizes this map's container after Leaflet has
// already measured it — Leaflet has no way to know that happened on its own,
// so without this it leaves the newly-revealed area blank/gray instead of
// drawing tiles into it.
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

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
};

const ARGENTINA_VIEW: [number, number] = [-38.4161, -63.6167];
const WORLD_VIEW: [number, number] = [15, 0];

// A plain red-circle SVG as a data URI — avoids the well-known Leaflet +
// bundler issue where the default marker icon's relative image paths don't
// resolve, and doubles as the "marcador rojo" the module explicitly asked for.
const redIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0z" fill="#e5484d" stroke="#0c0c0e" stroke-width="1.5"/>
        <circle cx="13" cy="13" r="5" fill="#0c0c0e"/>
      </svg>`
    ),
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30],
});

export default function ShowMap() {
  const [shows, setShows] = useState<BookingShow[] | null>(null);
  const [view, setView] = useState<"argentina" | "mundo">("argentina");

  useEffect(() => {
    fetch("/api/booking/shows")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setShows(d.shows);
      })
      .catch(() => {});
  }, []);

  const markers = useMemo(
    () => (shows ?? []).filter((s) => s.lat != null && s.lng != null),
    [shows]
  );

  return (
    <div className="card bksm-card">
      <style>{`
        .bksm-card { display: flex; flex-direction: column; height: 100%; }
        .bksm-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 1rem; flex-wrap: wrap; }
        .bksm-title { font-size: 18px; font-weight: 700; letter-spacing: -.01em; }
        .bksm-toggle { display: flex; gap: 3px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-pill); padding: 3px; }
        .bksm-toggle-btn { border: none; background: transparent; border-radius: var(--radius-pill); padding: 6px 13px; font-size: 12px; font-weight: 600; color: var(--text-2); cursor: pointer; }
        .bksm-toggle-btn.active { background: var(--accent-glass-bg); color: var(--text-1); }
        .bksm-map-wrap { flex: 1; min-height: 380px; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--glass-border); }
        .bksm-empty-note { font-size: 12px; color: var(--text-3); margin-top: 8px; }
        .bksm-map-wrap .leaflet-popup-content-wrapper { background: var(--glass-bg-strong); color: var(--text-1); border-radius: 10px; box-shadow: var(--shadow-glass-lg); }
        .bksm-map-wrap .leaflet-popup-tip { background: var(--glass-bg-strong); }
        .bksm-map-wrap .leaflet-container a.leaflet-popup-close-button { color: var(--text-2); }
        .bksm-map-wrap .leaflet-bar a { background: var(--bg-2); color: var(--text-1); border-color: var(--glass-border); }
        .bksm-map-wrap .leaflet-bar a:hover { background: var(--glass-bg-strong); }
        .bksm-map-wrap .leaflet-control-attribution { background: rgba(12,12,14,0.7); color: var(--text-3); }
        .bksm-map-wrap .leaflet-control-attribution a { color: var(--text-2); }
      `}</style>

      <div className="bksm-header">
        <div>
          <div className="card-label">Mapa de shows</div>
          <div className="bksm-title">Ubicaciones</div>
        </div>
        <div className="bksm-toggle">
          <button className={`bksm-toggle-btn${view === "argentina" ? " active" : ""}`} onClick={() => setView("argentina")}>
            Argentina
          </button>
          <button className={`bksm-toggle-btn${view === "mundo" ? " active" : ""}`} onClick={() => setView("mundo")}>
            Mundo
          </button>
        </div>
      </div>

      <div className="bksm-map-wrap">
        <MapContainer
          key={view}
          center={view === "argentina" ? ARGENTINA_VIEW : WORLD_VIEW}
          zoom={view === "argentina" ? 4 : 2}
          style={{ height: "100%", width: "100%", minHeight: 380 }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ResizeHandler />
          {markers.map((s) => (
            <Marker key={s.id} position={[s.lat as number, s.lng as number]} icon={redIcon}>
              <Popup>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <strong>{s.artistName}</strong><br />
                  {s.ciudad}{s.provincia ? `, ${s.provincia}` : ""}{s.pais ? `, ${s.pais}` : ""}<br />
                  {s.venue && <>{s.venue}<br /></>}
                  {new Date(s.fecha + "T00:00:00").toLocaleDateString("es-AR")}{s.hora ? ` · ${s.hora} hs` : ""}<br />
                  {s.estado}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {shows && markers.length === 0 && (
        <p className="bksm-empty-note">Ningún show tiene ubicación resuelta todavía — se completa automáticamente al cargar ciudad/provincia/país.</p>
      )}
    </div>
  );
}
