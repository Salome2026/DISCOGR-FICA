"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HojaDeRuta } from "@/lib/db/tourManager";

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [map, points]);
  return null;
}

// This card sits in a CSS grid whose row height settles after the browser's
// first layout pass, resizing the map container right after Leaflet measured
// it — without this it leaves part of the map blank/gray instead of tiles.
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

// Same red-marker data URI as Booking's ShowMap — kept visually consistent
// across modules, avoids the Leaflet default-icon bundler path issue.
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

const blueIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0z" fill="#3fc6d1" stroke="#0c0c0e" stroke-width="1.5"/>
        <circle cx="13" cy="13" r="5" fill="#0c0c0e"/>
      </svg>`
    ),
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30],
});

// GeoJSON stores coordinates as [lng, lat] — Leaflet wants [lat, lng].
function geojsonToLatLngs(geojson: unknown): [number, number][] {
  const coords = (geojson as { coordinates?: [number, number][] } | null)?.coordinates;
  if (!Array.isArray(coords)) return [];
  return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
}

export default function RouteMap({ hoja }: { hoja: HojaDeRuta }) {
  const hasOrigen = hoja.origenLat != null && hoja.origenLng != null;
  const hasVenue = hoja.venueLat != null && hoja.venueLng != null;

  if (!hasOrigen && !hasVenue) {
    return (
      <div className="tm-card" style={{ fontSize: 12.5, color: "var(--text-3)", textAlign: "center" }}>
        Ninguna ubicación fue resuelta todavía — completá la dirección del venue y del origen para ver el mapa.
      </div>
    );
  }

  const idaLine = geojsonToLatLngs(hoja.rutaIdaGeojson);
  const vueltaLine = geojsonToLatLngs(hoja.rutaVueltaGeojson);
  const points: [number, number][] = [
    ...(hasOrigen ? [[hoja.origenLat as number, hoja.origenLng as number] as [number, number]] : []),
    ...(hasVenue ? [[hoja.venueLat as number, hoja.venueLng as number] as [number, number]] : []),
    ...idaLine,
    ...vueltaLine,
  ];

  const mapsUrl =
    hasOrigen && hasVenue
      ? `https://www.google.com/maps/dir/?api=1&origin=${hoja.origenLat},${hoja.origenLng}&destination=${hoja.venueLat},${hoja.venueLng}&travelmode=driving`
      : null;

  return (
    <div className="tm-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="tm-card-label">Mapa del recorrido</div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent-color)", textDecoration: "none" }}>
            Abrir en Google Maps ↗
          </a>
        )}
      </div>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--glass-border)", height: 320 }}>
        <MapContainer center={points[0] ?? [-34.6, -58.4]} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={points} />
          <ResizeHandler />
          {hasOrigen && (
            <Marker position={[hoja.origenLat as number, hoja.origenLng as number]} icon={blueIcon}>
              <Popup>{hoja.origenLabel || "Origen"}{hoja.origenFullAddress ? <><br />{hoja.origenFullAddress}</> : null}</Popup>
            </Marker>
          )}
          {hasVenue && (
            <Marker position={[hoja.venueLat as number, hoja.venueLng as number]} icon={redIcon}>
              <Popup>{hoja.venue || "Venue"}{hoja.venueFullAddress ? <><br />{hoja.venueFullAddress}</> : null}</Popup>
            </Marker>
          )}
          {idaLine.length > 0 && <Polyline positions={idaLine} pathOptions={{ color: "#3fc6d1", weight: 4 }} />}
          {vueltaLine.length > 0 && <Polyline positions={vueltaLine} pathOptions={{ color: "#e5484d", weight: 3, dashArray: "6 6" }} />}
        </MapContainer>
      </div>
    </div>
  );
}
