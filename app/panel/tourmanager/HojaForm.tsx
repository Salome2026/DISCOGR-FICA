"use client";

import { useState } from "react";
import type { HojaDeRuta } from "@/lib/db/tourManager";
import ArtistPicker, { type ArtistResult } from "./ArtistPicker";
import BookingShowPicker, { type BookingShowLite } from "./BookingShowPicker";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-1)",
  fontSize: 13,
  marginTop: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>{label}</label>
      {children}
    </div>
  );
}

const TIPOS_EVENTO = ["Show", "Boliche", "Festival", "Evento privado", "Radio", "TV", "Prensa", "Otro"];
const ORIGEN_LABELS = ["Domicilio Artista", "Hotel", "Aeropuerto", "Otro"];

function timeToMinutes(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function minutesToTime(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function HojaForm({
  hoja,
  onClose,
  onSaved,
}: {
  hoja: HojaDeRuta | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // --- Los 7 campos mínimos que pide el spec ---
  const [artistName, setArtistName] = useState(hoja?.artistName ?? "");
  const [fecha, setFecha] = useState(hoja?.fecha ?? "");
  const [horaShow, setHoraShow] = useState(hoja?.horaShow ?? "");
  const [tipoEvento, setTipoEvento] = useState(hoja?.tipoEvento ?? "");
  const [venue, setVenue] = useState(hoja?.venue ?? "");
  const [venueDireccion, setVenueDireccion] = useState(hoja?.venueDireccion ?? "");
  const [origenLabel, setOrigenLabel] = useState(hoja?.origenLabel ?? "");
  const [origenDireccion, setOrigenDireccion] = useState(hoja?.origenDireccion ?? "");

  // --- Integraciones (Fase 6) — links suaves, nunca bloquean la carga manual ---
  const [bookingShowId, setBookingShowId] = useState<string | null>(hoja?.bookingShowId ?? null);
  const [artistId, setArtistId] = useState<string | null>(hoja?.artistId ?? null);

  // --- Direcciones resueltas (Fase 3) — geocoding automático al salir del campo ---
  const [venueResolving, setVenueResolving] = useState(false);
  const [venueLat, setVenueLat] = useState<number | null>(hoja?.venueLat ?? null);
  const [venueLng, setVenueLng] = useState<number | null>(hoja?.venueLng ?? null);
  const [venueFullAddress, setVenueFullAddress] = useState(hoja?.venueFullAddress ?? "");
  const [venueCiudad, setVenueCiudad] = useState(hoja?.venueCiudad ?? "");
  const [venueProvincia, setVenueProvincia] = useState(hoja?.venueProvincia ?? "");
  const [venuePais, setVenuePais] = useState(hoja?.venuePais ?? "");

  const [origenResolving, setOrigenResolving] = useState(false);
  const [origenLat, setOrigenLat] = useState<number | null>(hoja?.origenLat ?? null);
  const [origenLng, setOrigenLng] = useState<number | null>(hoja?.origenLng ?? null);
  const [origenFullAddress, setOrigenFullAddress] = useState(hoja?.origenFullAddress ?? "");

  async function resolveAddress(kind: "venue" | "origen", value: string) {
    if (!value.trim()) return;
    const setResolving = kind === "venue" ? setVenueResolving : setOrigenResolving;
    setResolving(true);
    try {
      const res = await fetch("/api/tourmanager/resolve-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.resolved) return;
      if (kind === "venue") {
        setVenueLat(data.lat);
        setVenueLng(data.lng);
        setVenueFullAddress(data.fullAddress ?? "");
        setVenueCiudad(data.ciudad ?? "");
        setVenueProvincia(data.provincia ?? "");
        setVenuePais(data.pais ?? "");
      } else {
        setOrigenLat(data.lat);
        setOrigenLng(data.lng);
        setOrigenFullAddress(data.fullAddress ?? "");
      }
    } catch {
      // silencioso — el campo sigue disponible para carga manual
    } finally {
      setResolving(false);
    }
  }

  // Booking ya resolvió ciudad/provincia/país/lat/lng para este show — se
  // reusan directo (sin volver a geocodificar) y se guarda booking_show_id
  // para dejar el vínculo. Origen nunca viene de Booking (no lo trackea).
  function handleSelectBookingShow(show: BookingShowLite) {
    setBookingShowId(show.id);
    setArtistName(show.artistName);
    setFecha(show.fecha);
    if (show.hora) setHoraShow(show.hora);
    if (show.venue) setVenue(show.venue);
    const direccionResumen = [show.venue, show.ciudad, show.provincia, show.pais].filter(Boolean).join(", ");
    if (direccionResumen) setVenueDireccion(direccionResumen);
    if (show.lat != null && show.lng != null) {
      setVenueLat(show.lat);
      setVenueLng(show.lng);
    }
    setVenueCiudad(show.ciudad ?? "");
    setVenueProvincia(show.provincia ?? "");
    setVenuePais(show.pais ?? "");
    setVenueFullAddress([show.ciudad, show.provincia, show.pais].filter(Boolean).join(", "));
  }

  // --- Todo lo demás: opcional, colapsado por default ---
  const [showDetails, setShowDetails] = useState(!!hoja);
  const [duracionShowMin, setDuracionShowMin] = useState(hoja?.duracionShowMin?.toString() ?? "");
  const [pax, setPax] = useState(hoja?.pax?.toString() ?? "");
  const [venueContactoNombre, setVenueContactoNombre] = useState(hoja?.venueContactoNombre ?? "");
  const [venueContactoTelefono, setVenueContactoTelefono] = useState(hoja?.venueContactoTelefono ?? "");
  const [contactoArtistaNombre, setContactoArtistaNombre] = useState(hoja?.contactoArtistaNombre ?? "");
  const [contactoArtistaTelefono, setContactoArtistaTelefono] = useState(hoja?.contactoArtistaTelefono ?? "");
  const [artistLiaisonNombre, setArtistLiaisonNombre] = useState(hoja?.artistLiaisonNombre ?? "");
  const [artistLiaisonTelefono, setArtistLiaisonTelefono] = useState(hoja?.artistLiaisonTelefono ?? "");
  const [driverNombre, setDriverNombre] = useState(hoja?.driverNombre ?? "");
  const [driverTelefono, setDriverTelefono] = useState(hoja?.driverTelefono ?? "");
  const [runningOrder, setRunningOrder] = useState(hoja?.runningOrder ?? "");
  const [notas, setNotas] = useState(hoja?.notas ?? "");
  const [estado, setEstado] = useState(hoja?.estado ?? "Borrador");

  // --- Horarios/distancias: manuales por ahora, la Fase 3/4 los autocompleta ---
  const [horaSalida, setHoraSalida] = useState(hoja?.horaSalida ?? "");
  const [horaLlegadaVenue, setHoraLlegadaVenue] = useState(hoja?.horaLlegadaVenue ?? "");
  const [horaSalidaVenue, setHoraSalidaVenue] = useState(hoja?.horaSalidaVenue ?? "");
  const [horaLlegadaDestino, setHoraLlegadaDestino] = useState(hoja?.horaLlegadaDestino ?? "");
  const [distanciaIdaKm, setDistanciaIdaKm] = useState(hoja?.distanciaIdaKm?.toString() ?? "");
  const [duracionIdaMin, setDuracionIdaMin] = useState(hoja?.duracionIdaMin?.toString() ?? "");
  const [distanciaVueltaKm, setDistanciaVueltaKm] = useState(hoja?.distanciaVueltaKm?.toString() ?? "");
  const [duracionVueltaMin, setDuracionVueltaMin] = useState(hoja?.duracionVueltaMin?.toString() ?? "");
  const [bufferPrepMin, setBufferPrepMin] = useState((hoja?.bufferPrepMin ?? 30).toString());
  const [rutaIdaGeojson, setRutaIdaGeojson] = useState<unknown | null>(hoja?.rutaIdaGeojson ?? null);
  const [rutaVueltaGeojson, setRutaVueltaGeojson] = useState<unknown | null>(hoja?.rutaVueltaGeojson ?? null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeMsg, setRouteMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCalculateRoute() {
    setRouteMsg(null);
    if (venueLat == null || venueLng == null || origenLat == null || origenLng == null) {
      setRouteMsg("Necesitás resolver la dirección del venue y del origen primero (esperá a que termine de resolver, o pegá una dirección más específica).");
      return;
    }
    setCalculatingRoute(true);
    try {
      const [idaRes, vueltaRes] = await Promise.all([
        fetch("/api/tourmanager/route-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: { lat: origenLat, lng: origenLng }, destination: { lat: venueLat, lng: venueLng } }),
        }).then((r) => r.json()),
        fetch("/api/tourmanager/route-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: { lat: venueLat, lng: venueLng }, destination: { lat: origenLat, lng: origenLng } }),
        }).then((r) => r.json()),
      ]);

      let idaMin: number | null = null;
      let vueltaMin: number | null = null;
      if (idaRes.resolved) {
        setDistanciaIdaKm(String(idaRes.distanceKm));
        setDuracionIdaMin(String(idaRes.durationMin));
        setRutaIdaGeojson(idaRes.geometry);
        idaMin = idaRes.durationMin;
      }
      if (vueltaRes.resolved) {
        setDistanciaVueltaKm(String(vueltaRes.distanceKm));
        setDuracionVueltaMin(String(vueltaRes.durationMin));
        setRutaVueltaGeojson(vueltaRes.geometry);
        vueltaMin = vueltaRes.durationMin;
      }
      if (!idaRes.resolved && !vueltaRes.resolved) {
        setRouteMsg("No se pudo calcular la ruta automáticamente — completá los horarios manualmente.");
        return;
      }

      // Horarios sugeridos — solo completan campos vacíos, nunca pisan algo
      // ya tipeado a mano.
      const showMin = timeToMinutes(horaShow);
      const buffer = parseInt(bufferPrepMin, 10) || 0;
      const showDuration = parseInt(duracionShowMin, 10) || 0;
      if (showMin != null) {
        const llegadaVenue = showMin - buffer;
        if (!horaLlegadaVenue) setHoraLlegadaVenue(minutesToTime(llegadaVenue));
        if (idaMin != null && !horaSalida) setHoraSalida(minutesToTime(llegadaVenue - idaMin));
        const salidaVenue = showMin + showDuration;
        if (!horaSalidaVenue) setHoraSalidaVenue(minutesToTime(salidaVenue));
        if (vueltaMin != null && !horaLlegadaDestino) setHoraLlegadaDestino(minutesToTime(salidaVenue + vueltaMin));
      }
      setRouteMsg("Ruta calculada.");
    } finally {
      setCalculatingRoute(false);
    }
  }

  function toIntOrNull(v: string): number | null {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  function toNumOrNull(v: string): number | null {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!artistName.trim() || !fecha) {
      setError("Artista y fecha son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const url = hoja ? `/api/tourmanager/${hoja.id}` : "/api/tourmanager";
      const method = hoja ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName: artistName.trim(),
          fecha,
          horaShow: horaShow || null,
          tipoEvento: tipoEvento || null,
          venue: venue || null,
          venueDireccion: venueDireccion || null,
          origenLabel: origenLabel || null,
          origenDireccion: origenDireccion || null,
          venueLat, venueLng,
          venueFullAddress: venueFullAddress || null,
          venueCiudad: venueCiudad || null,
          venueProvincia: venueProvincia || null,
          venuePais: venuePais || null,
          origenLat, origenLng,
          origenFullAddress: origenFullAddress || null,
          distanciaIdaKm: toNumOrNull(distanciaIdaKm),
          duracionIdaMin: toIntOrNull(duracionIdaMin),
          distanciaVueltaKm: toNumOrNull(distanciaVueltaKm),
          duracionVueltaMin: toIntOrNull(duracionVueltaMin),
          horaSalida: horaSalida || null,
          horaLlegadaVenue: horaLlegadaVenue || null,
          horaSalidaVenue: horaSalidaVenue || null,
          horaLlegadaDestino: horaLlegadaDestino || null,
          duracionShowMin: toIntOrNull(duracionShowMin),
          pax: toIntOrNull(pax),
          venueContactoNombre: venueContactoNombre || null,
          venueContactoTelefono: venueContactoTelefono || null,
          contactoArtistaNombre: contactoArtistaNombre || null,
          contactoArtistaTelefono: contactoArtistaTelefono || null,
          artistLiaisonNombre: artistLiaisonNombre || null,
          artistLiaisonTelefono: artistLiaisonTelefono || null,
          driverNombre: driverNombre || null,
          driverTelefono: driverTelefono || null,
          runningOrder: runningOrder || null,
          notas: notas || null,
          estado,
          bufferPrepMin: parseInt(bufferPrepMin, 10) || 30,
          rutaIdaGeojson,
          rutaVueltaGeojson,
          bookingShowId,
          artistId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", overflowY: "auto" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ background: "var(--glass-bg-strong)", backdropFilter: "blur(40px) saturate(1.7)", WebkitBackdropFilter: "blur(40px) saturate(1.7)", color: "var(--text-1)", borderRadius: 16, border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-glass-lg)", width: "100%", maxWidth: 560, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>{hoja ? "Editar hoja de ruta" : "Nueva hoja de ruta"}</div>
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          Cargá solo lo esencial — el resto se puede completar después o se autocompleta más adelante.
        </p>

        <Field label="¿Ya existe este show en Booking? (opcional — autocompleta abajo)">
          <BookingShowPicker onSelect={handleSelectBookingShow} />
          {bookingShowId && (
            <div style={{ fontSize: 11, color: "var(--good-ink)", marginTop: 4 }}>✓ Vinculado a un show de Booking.</div>
          )}
        </Field>

        <Field label="Artista">
          <ArtistPicker
            value={artistName}
            onChange={setArtistName}
            onSelect={(a) => setArtistId(a?.id ?? null)}
          />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Fecha">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Horario del show">
              <input type="time" value={horaShow} onChange={(e) => setHoraShow(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>
        <Field label="Tipo de evento">
          <select value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)} style={inputStyle}>
            <option value="">Elegir...</option>
            {TIPOS_EVENTO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Venue">
          <input value={venue} onChange={(e) => setVenue(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Dirección del venue (o link de Google Maps)">
          <input
            value={venueDireccion}
            onChange={(e) => setVenueDireccion(e.target.value)}
            onBlur={(e) => resolveAddress("venue", e.target.value)}
            placeholder="Dirección o link de Maps"
            style={inputStyle}
          />
          {venueResolving && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Resolviendo dirección...</div>}
          {!venueResolving && venueFullAddress && (
            <div style={{ fontSize: 11, color: "var(--good-ink)", marginTop: 4 }}>
              ✓ {venueFullAddress}{venueCiudad ? ` — ${venueCiudad}` : ""}{venueProvincia ? `, ${venueProvincia}` : ""}
            </div>
          )}
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Origen">
              <select value={origenLabel} onChange={(e) => setOrigenLabel(e.target.value)} style={inputStyle}>
                <option value="">Elegir...</option>
                {ORIGEN_LABELS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ flex: 2 }}>
            <Field label="Dirección de salida (o link de Google Maps)">
              <input
                value={origenDireccion}
                onChange={(e) => setOrigenDireccion(e.target.value)}
                onBlur={(e) => resolveAddress("origen", e.target.value)}
                placeholder="Dirección o link de Maps"
                style={inputStyle}
              />
              {origenResolving && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Resolviendo dirección...</div>}
              {!origenResolving && origenFullAddress && (
                <div style={{ fontSize: 11, color: "var(--good-ink)", marginTop: 4 }}>✓ {origenFullAddress}</div>
              )}
            </Field>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          style={{ background: "transparent", border: "1px dashed var(--line-soft)", borderRadius: 8, padding: "8px 0", color: "var(--text-2)", fontSize: 12.5, cursor: "pointer" }}
        >
          {showDetails ? "▾ Ocultar detalles adicionales" : "▸ Agregar detalles adicionales (opcional)"}
        </button>

        {showDetails && (
          <>
            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>
              Venue
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Contacto del venue"><input value={venueContactoNombre} onChange={(e) => setVenueContactoNombre(e.target.value)} style={inputStyle} /></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Tel. contacto venue"><input value={venueContactoTelefono} onChange={(e) => setVenueContactoTelefono(e.target.value)} style={inputStyle} /></Field>
              </div>
            </div>
            <Field label="Duración del show (min)">
              <input type="number" value={duracionShowMin} onChange={(e) => setDuracionShowMin(e.target.value)} style={inputStyle} />
            </Field>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginTop: 4 }}>Cronograma de traslados</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <Field label="Minutos de margen antes del show">
                  <input type="number" value={bufferPrepMin} onChange={(e) => setBufferPrepMin(e.target.value)} style={inputStyle} />
                </Field>
              </div>
              <button
                type="button"
                onClick={handleCalculateRoute}
                disabled={calculatingRoute}
                style={{ background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8, padding: "9px 14px", color: "var(--text-1)", fontWeight: 600, fontSize: 12.5, cursor: calculatingRoute ? "default" : "pointer", whiteSpace: "nowrap" }}
              >
                {calculatingRoute ? "Calculando..." : "Calcular ruta automáticamente"}
              </button>
            </div>
            {routeMsg && <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{routeMsg}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Salida"><input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} style={inputStyle} /></Field>
              <Field label="Llegada al venue"><input type="time" value={horaLlegadaVenue} onChange={(e) => setHoraLlegadaVenue(e.target.value)} style={inputStyle} /></Field>
              <Field label="Salida del venue"><input type="time" value={horaSalidaVenue} onChange={(e) => setHoraSalidaVenue(e.target.value)} style={inputStyle} /></Field>
              <Field label="Llegada a destino"><input type="time" value={horaLlegadaDestino} onChange={(e) => setHoraLlegadaDestino(e.target.value)} style={inputStyle} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <Field label="Km ida"><input type="number" step="0.1" value={distanciaIdaKm} onChange={(e) => setDistanciaIdaKm(e.target.value)} style={inputStyle} /></Field>
              <Field label="Min ida"><input type="number" value={duracionIdaMin} onChange={(e) => setDuracionIdaMin(e.target.value)} style={inputStyle} /></Field>
              <Field label="Km vuelta"><input type="number" step="0.1" value={distanciaVueltaKm} onChange={(e) => setDistanciaVueltaKm(e.target.value)} style={inputStyle} /></Field>
              <Field label="Min vuelta"><input type="number" value={duracionVueltaMin} onChange={(e) => setDuracionVueltaMin(e.target.value)} style={inputStyle} /></Field>
            </div>
            <Field label="Pax (cantidad de personas en el traslado)">
              <input type="number" value={pax} onChange={(e) => setPax(e.target.value)} style={inputStyle} />
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Driver"><input value={driverNombre} onChange={(e) => setDriverNombre(e.target.value)} style={inputStyle} /></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Tel. driver"><input value={driverTelefono} onChange={(e) => setDriverTelefono(e.target.value)} style={inputStyle} /></Field>
              </div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginTop: 4 }}>Contactos</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Contacto artista"><input value={contactoArtistaNombre} onChange={(e) => setContactoArtistaNombre(e.target.value)} style={inputStyle} /></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Tel. contacto artista"><input value={contactoArtistaTelefono} onChange={(e) => setContactoArtistaTelefono(e.target.value)} style={inputStyle} /></Field>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Artist Liaison"><input value={artistLiaisonNombre} onChange={(e) => setArtistLiaisonNombre(e.target.value)} style={inputStyle} /></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Tel. Artist Liaison"><input value={artistLiaisonTelefono} onChange={(e) => setArtistLiaisonTelefono(e.target.value)} style={inputStyle} /></Field>
              </div>
            </div>

            <Field label="Running Order">
              <textarea value={runningOrder} onChange={(e) => setRunningOrder(e.target.value)} rows={2} placeholder={"Ej: Sofi B: 03.30"} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <Field label="Notas (valor del show, seña, valor driver, responsable de liquidación, etc.)">
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <Field label="Estado">
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
                <option value="Borrador">Borrador</option>
                <option value="Confirmado">Confirmado</option>
              </select>
            </Field>
          </>
        )}

        {error && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, cursor: saving ? "default" : "pointer", fontSize: 13 }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
