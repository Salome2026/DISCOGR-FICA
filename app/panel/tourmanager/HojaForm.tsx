"use client";

import { useEffect, useState } from "react";
import type { HojaDeRuta } from "@/lib/db/tourManager";
import type { BookingShow } from "@/lib/db/booking";
import type { ParadaIntermedia } from "@discografica/shared/types/tourManager";
import ArtistPicker, { type ArtistResult } from "./ArtistPicker";
import BookingShowPicker from "./BookingShowPicker";

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

// Un input de dirección con autocompletado (pega texto o link de Maps,
// resuelve al salir del campo) — el mismo comportamiento para cada punto
// del recorrido, así que vive una sola vez en vez de repetirse 6 veces.
export function AddressField({
  label,
  value,
  onChange,
  onResolved,
  resolvedAddress,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onResolved: (data: { lat: number; lng: number; fullAddress: string | null; ciudad: string | null; provincia: string | null; pais: string | null } | null) => void;
  resolvedAddress: string | null;
}) {
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleBlur(v: string) {
    if (!v.trim()) return;
    setResolving(true);
    setNotFound(false);
    try {
      const res = await fetch("/api/tourmanager/resolve-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: v }),
      });
      const data = await res.json();
      if (!res.ok || !data.resolved) {
        setNotFound(true);
        onResolved(null);
        return;
      }
      onResolved({ lat: data.lat, lng: data.lng, fullAddress: data.fullAddress ?? null, ciudad: data.ciudad ?? null, provincia: data.provincia ?? null, pais: data.pais ?? null });
    } catch {
      setNotFound(true);
      onResolved(null);
    } finally {
      setResolving(false);
    }
  }

  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setNotFound(false); }}
        onBlur={(e) => handleBlur(e.target.value)}
        placeholder="Dirección o link de Google Maps"
        style={inputStyle}
      />
      {resolving && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Resolviendo dirección...</div>}
      {!resolving && resolvedAddress && <div style={{ fontSize: 11, color: "var(--good-ink)", marginTop: 4 }}>✓ {resolvedAddress}</div>}
      {!resolving && notFound && value.trim() && (
        <div style={{ fontSize: 11, color: "var(--warn-ink)", marginTop: 4 }}>No pudimos ubicar esta dirección — revisala o probá con un link de Maps.</div>
      )}
    </Field>
  );
}

const TIPOS_EVENTO = ["Show", "Boliche", "Festival", "Evento privado", "Radio", "TV", "Prensa", "Otro"];
const ORIGEN_LABELS = ["Domicilio Artista", "Hotel", "Aeropuerto", "Punto de encuentro"];
const BUFFER_PRESETS = [
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1 hora 30" },
  { value: 120, label: "2 horas" },
];

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
function toIntOrNull(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function toNumOrNull(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
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
  // --- Lo esencial ---
  const [artistName, setArtistName] = useState(hoja?.artistName ?? "");
  const [fecha, setFecha] = useState(hoja?.fecha ?? "");
  const [horaShow, setHoraShow] = useState(hoja?.horaShow ?? "");
  const [horaAperturaPuertas, setHoraAperturaPuertas] = useState(hoja?.horaAperturaPuertas ?? "");
  const [tipoEvento, setTipoEvento] = useState(hoja?.tipoEvento ?? "");
  const [venue, setVenue] = useState(hoja?.venue ?? "");
  const [venueDireccion, setVenueDireccion] = useState(hoja?.venueDireccion ?? "");
  const [origenLabel, setOrigenLabel] = useState(hoja?.origenLabel ?? "");
  const [origenDireccion, setOrigenDireccion] = useState(hoja?.origenDireccion ?? "");

  const [artistId, setArtistId] = useState<string | null>(hoja?.artistId ?? null);
  const [bookingShowId, setBookingShowId] = useState<string | null>(hoja?.bookingShowId ?? null);

  // --- Direcciones resueltas ---
  const [venueLat, setVenueLat] = useState<number | null>(hoja?.venueLat ?? null);
  const [venueLng, setVenueLng] = useState<number | null>(hoja?.venueLng ?? null);
  const [venueFullAddress, setVenueFullAddress] = useState(hoja?.venueFullAddress ?? "");
  const [venueCiudad, setVenueCiudad] = useState(hoja?.venueCiudad ?? "");
  const [venueProvincia, setVenueProvincia] = useState(hoja?.venueProvincia ?? "");
  const [venuePais, setVenuePais] = useState(hoja?.venuePais ?? "");

  const [origenLat, setOrigenLat] = useState<number | null>(hoja?.origenLat ?? null);
  const [origenLng, setOrigenLng] = useState<number | null>(hoja?.origenLng ?? null);
  const [origenFullAddress, setOrigenFullAddress] = useState(hoja?.origenFullAddress ?? "");

  function resolveVenue(v: string) {
    setVenueDireccion(v);
  }

  // Trae artista/fecha/hora/venue/ciudad/coords de un show ya cargado en
  // Booking, para no re-tipear nada. Booking no guarda una dirección de
  // calle separada del venue (solo nombre + ciudad/provincia/país + lat/lng),
  // así que venueDireccion queda vacío para completar a mano si hace falta
  // el link/dirección exacta — pero las coordenadas ya alcanzan para que la
  // ruta se calcule sola.
  function applyBookingShow(show: BookingShow) {
    setBookingShowId(show.id);
    setArtistName(show.artistName);
    setFecha(show.fecha.slice(0, 10));
    if (show.hora) setHoraShow(show.hora);
    setVenue(show.venue ?? "");
    setVenueCiudad(show.ciudad ?? "");
    setVenueProvincia(show.provincia ?? "");
    setVenuePais(show.pais ?? "");
    setVenueLat(show.lat);
    setVenueLng(show.lng);
    setVenueFullAddress(
      [show.venue, show.ciudad, show.provincia, show.pais].filter(Boolean).join(", ")
    );
  }

  // --- Punto de encuentro del equipo ---
  const [puntoEncuentroNombre, setPuntoEncuentroNombre] = useState(hoja?.puntoEncuentroNombre ?? "");
  const [puntoEncuentroDireccion, setPuntoEncuentroDireccion] = useState(hoja?.puntoEncuentroDireccion ?? "");
  const [puntoEncuentroFullAddress, setPuntoEncuentroFullAddress] = useState(hoja?.puntoEncuentroFullAddress ?? "");
  const [puntoEncuentroLat, setPuntoEncuentroLat] = useState<number | null>(hoja?.puntoEncuentroLat ?? null);
  const [puntoEncuentroLng, setPuntoEncuentroLng] = useState<number | null>(hoja?.puntoEncuentroLng ?? null);
  const [horaEncuentroEquipo, setHoraEncuentroEquipo] = useState(hoja?.horaEncuentroEquipo ?? "");

  // --- Búsqueda del artista ---
  const [direccionBusquedaArtista, setDireccionBusquedaArtista] = useState(hoja?.direccionBusquedaArtista ?? "");
  const [busquedaArtistaFullAddress, setBusquedaArtistaFullAddress] = useState(hoja?.busquedaArtistaFullAddress ?? "");
  const [busquedaArtistaLat, setBusquedaArtistaLat] = useState<number | null>(hoja?.busquedaArtistaLat ?? null);
  const [busquedaArtistaLng, setBusquedaArtistaLng] = useState<number | null>(hoja?.busquedaArtistaLng ?? null);
  const [horaBusquedaArtista, setHoraBusquedaArtista] = useState(hoja?.horaBusquedaArtista ?? "");

  const [horaLlegadaCiudad, setHoraLlegadaCiudad] = useState(hoja?.horaLlegadaCiudad ?? "");

  // --- Prueba de sonido ---
  const [lugarPruebaSonido, setLugarPruebaSonido] = useState(hoja?.lugarPruebaSonido ?? "");
  const [direccionPruebaSonido, setDireccionPruebaSonido] = useState(hoja?.direccionPruebaSonido ?? "");
  const [pruebaSonidoFullAddress, setPruebaSonidoFullAddress] = useState(hoja?.pruebaSonidoFullAddress ?? "");
  const [pruebaSonidoLat, setPruebaSonidoLat] = useState<number | null>(hoja?.pruebaSonidoLat ?? null);
  const [pruebaSonidoLng, setPruebaSonidoLng] = useState<number | null>(hoja?.pruebaSonidoLng ?? null);
  const [horaPruebaSonido, setHoraPruebaSonido] = useState(hoja?.horaPruebaSonido ?? "");
  const [duracionPruebaSonidoMin, setDuracionPruebaSonidoMin] = useState(hoja?.duracionPruebaSonidoMin?.toString() ?? "");

  const [horaComida, setHoraComida] = useState(hoja?.horaComida ?? "");

  // --- Hotel ---
  const [hotelNombre, setHotelNombre] = useState(hoja?.hotelNombre ?? "");
  const [hotelDireccion, setHotelDireccion] = useState(hoja?.hotelDireccion ?? "");
  const [hotelFullAddress, setHotelFullAddress] = useState(hoja?.hotelFullAddress ?? "");
  const [hotelLat, setHotelLat] = useState<number | null>(hoja?.hotelLat ?? null);
  const [hotelLng, setHotelLng] = useState<number | null>(hoja?.hotelLng ?? null);
  const [horaLlegadaHotel, setHoraLlegadaHotel] = useState(hoja?.horaLlegadaHotel ?? "");
  const [horaCheckin, setHoraCheckin] = useState(hoja?.horaCheckin ?? "");
  const [horaCheckout, setHoraCheckout] = useState(hoja?.horaCheckout ?? "");

  // --- Paradas intermedias ---
  const [paradas, setParadas] = useState<ParadaIntermedia[]>(hoja?.paradas ?? []);
  function addParada() {
    setParadas((ps) => [...ps, { nombre: "", direccion: "", fullAddress: null, lat: null, lng: null, hora: null }]);
  }
  function updateParada(i: number, patch: Partial<ParadaIntermedia>) {
    setParadas((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function removeParada(i: number) {
    setParadas((ps) => ps.filter((_, idx) => idx !== i));
  }

  // --- Todo lo demás: opcional ---
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

  // --- Horarios/distancias ida-vuelta ---
  const [horaSalida, setHoraSalida] = useState(hoja?.horaSalida ?? "");
  const [horaLlegadaVenue, setHoraLlegadaVenue] = useState(hoja?.horaLlegadaVenue ?? "");
  const [horaSalidaVenue, setHoraSalidaVenue] = useState(hoja?.horaSalidaVenue ?? "");
  const [horaLlegadaDestino, setHoraLlegadaDestino] = useState(hoja?.horaLlegadaDestino ?? "");
  const [distanciaIdaKm, setDistanciaIdaKm] = useState(hoja?.distanciaIdaKm?.toString() ?? "");
  const [duracionIdaMin, setDuracionIdaMin] = useState(hoja?.duracionIdaMin?.toString() ?? "");
  const [distanciaVueltaKm, setDistanciaVueltaKm] = useState(hoja?.distanciaVueltaKm?.toString() ?? "");
  const [duracionVueltaMin, setDuracionVueltaMin] = useState(hoja?.duracionVueltaMin?.toString() ?? "");
  const [bufferPrepMin, setBufferPrepMin] = useState((hoja?.bufferPrepMin ?? 30).toString());
  const [bufferPreset, setBufferPreset] = useState<string>(() => {
    const initial = hoja?.bufferPrepMin ?? 30;
    return BUFFER_PRESETS.some((p) => p.value === initial) ? String(initial) : "custom";
  });
  const [rutaIdaGeojson, setRutaIdaGeojson] = useState<unknown | null>(hoja?.rutaIdaGeojson ?? null);
  const [rutaVueltaGeojson, setRutaVueltaGeojson] = useState<unknown | null>(hoja?.rutaVueltaGeojson ?? null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeMsg, setRouteMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleBufferPresetChange(v: string) {
    setBufferPreset(v);
    if (v !== "custom") setBufferPrepMin(v);
  }

  async function resolveVenueAddress(value: string) {
    if (!value.trim()) return;
    try {
      const res = await fetch("/api/tourmanager/resolve-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.resolved) return;
      setVenueLat(data.lat);
      setVenueLng(data.lng);
      setVenueFullAddress(data.fullAddress ?? "");
      setVenueCiudad(data.ciudad ?? "");
      setVenueProvincia(data.provincia ?? "");
      setVenuePais(data.pais ?? "");
    } catch {
      // silencioso — el campo sigue disponible para carga manual
    }
  }
  async function resolveOrigenAddress(value: string) {
    if (!value.trim()) return;
    try {
      const res = await fetch("/api/tourmanager/resolve-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.resolved) return;
      setOrigenLat(data.lat);
      setOrigenLng(data.lng);
      setOrigenFullAddress(data.fullAddress ?? "");
    } catch {
      // silencioso
    }
  }

  // Se recalcula solo — sin botón — cada vez que cambia el horario del show,
  // el origen, el destino o el tiempo de anticipación.
  useEffect(() => {
    if (venueLat == null || venueLng == null || origenLat == null || origenLng == null) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setCalculatingRoute(true);
      setRouteMsg(null);
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
        if (cancelled) return;

        let idaMin: number | null = null;
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
        }
        if (!idaRes.resolved && !vueltaRes.resolved) {
          setRouteMsg("No se pudo calcular la ruta automáticamente — completá los horarios manualmente.");
          return;
        }

        const showMin = timeToMinutes(horaShow);
        const buffer = parseInt(bufferPrepMin, 10) || 0;
        if (showMin != null) {
          const llegadaVenue = showMin - buffer;
          setHoraLlegadaVenue(minutesToTime(llegadaVenue));
          if (idaMin != null) setHoraSalida(minutesToTime(llegadaVenue - idaMin));
        }
      } finally {
        if (!cancelled) setCalculatingRoute(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [horaShow, bufferPrepMin, venueLat, venueLng, origenLat, origenLng]);

  useEffect(() => {
    const showMin = timeToMinutes(horaShow);
    if (showMin == null) return;
    const showDuration = parseInt(duracionShowMin, 10) || 0;
    const salidaVenue = showMin + showDuration;
    if (!horaSalidaVenue) setHoraSalidaVenue(minutesToTime(salidaVenue));
    const vueltaMin = toIntOrNull(duracionVueltaMin);
    if (vueltaMin != null && !horaLlegadaDestino) setHoraLlegadaDestino(minutesToTime(salidaVenue + vueltaMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaShow, duracionShowMin, duracionVueltaMin]);

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
          horaAperturaPuertas: horaAperturaPuertas || null,
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

          puntoEncuentroNombre: puntoEncuentroNombre || null,
          puntoEncuentroDireccion: puntoEncuentroDireccion || null,
          puntoEncuentroFullAddress: puntoEncuentroFullAddress || null,
          puntoEncuentroLat, puntoEncuentroLng,
          horaEncuentroEquipo: horaEncuentroEquipo || null,

          direccionBusquedaArtista: direccionBusquedaArtista || null,
          busquedaArtistaFullAddress: busquedaArtistaFullAddress || null,
          busquedaArtistaLat, busquedaArtistaLng,
          horaBusquedaArtista: horaBusquedaArtista || null,

          horaLlegadaCiudad: horaLlegadaCiudad || null,

          lugarPruebaSonido: lugarPruebaSonido || null,
          direccionPruebaSonido: direccionPruebaSonido || null,
          pruebaSonidoFullAddress: pruebaSonidoFullAddress || null,
          pruebaSonidoLat, pruebaSonidoLng,
          horaPruebaSonido: horaPruebaSonido || null,
          duracionPruebaSonidoMin: toIntOrNull(duracionPruebaSonidoMin),

          horaComida: horaComida || null,

          hotelNombre: hotelNombre || null,
          hotelDireccion: hotelDireccion || null,
          hotelFullAddress: hotelFullAddress || null,
          hotelLat, hotelLng,
          horaLlegadaHotel: horaLlegadaHotel || null,
          horaCheckin: horaCheckin || null,
          horaCheckout: horaCheckout || null,

          paradas: paradas.filter((p) => p.nombre.trim() || p.direccion),

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
          artistId,
          bookingShowId,
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
        style={{ background: "var(--glass-bg-strong)", backdropFilter: "blur(40px) saturate(1.7)", WebkitBackdropFilter: "blur(40px) saturate(1.7)", color: "var(--text-1)", borderRadius: 16, border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-glass-lg)", width: "100%", maxWidth: 600, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>{hoja ? "Editar hoja de ruta" : "Nueva hoja de ruta"}</div>
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          Cargá lo esencial primero — el recorrido completo (punto de encuentro, búsqueda del artista, prueba de sonido, hotel, regreso) está más abajo.
        </p>

        {!hoja && (
          <Field label="¿Ya existe este show en Booking?">
            <BookingShowPicker onSelect={applyBookingShow} />
            {bookingShowId && (
              <div style={{ fontSize: 11, color: "var(--good-ink)", marginTop: 4 }}>
                ✓ Datos traídos de Booking — revisá y completá lo que falte.
              </div>
            )}
          </Field>
        )}

        <Field label="Artista">
          <ArtistPicker
            value={artistName}
            onChange={setArtistName}
            onSelect={(a) => setArtistId(a?.id ?? null)}
          />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Fecha del show">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="¿A qué hora es el show?">
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
        <Field label="Lugar del show">
          <input value={venue} onChange={(e) => setVenue(e.target.value)} style={inputStyle} />
        </Field>
        <AddressField
          label="Dirección del show"
          value={venueDireccion}
          onChange={resolveVenue}
          onResolved={(d) => {
            if (!d) return;
            setVenueLat(d.lat); setVenueLng(d.lng);
            setVenueFullAddress(d.fullAddress ?? ""); setVenueCiudad(d.ciudad ?? "");
            setVenueProvincia(d.provincia ?? ""); setVenuePais(d.pais ?? "");
          }}
          resolvedAddress={venueFullAddress ? `${venueFullAddress}${venueCiudad ? ` — ${venueCiudad}` : ""}${venueProvincia ? `, ${venueProvincia}` : ""}` : null}
        />

        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          style={{ background: "transparent", border: "1px dashed var(--line-soft)", borderRadius: 8, padding: "8px 0", color: "var(--text-2)", fontSize: 12.5, cursor: "pointer" }}
        >
          {showDetails ? "▾ Ocultar el resto del recorrido" : "▸ Completar el resto del recorrido"}
        </button>

        {showDetails && (
          <>
            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10, fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)" }}>
              1 · Salida del equipo
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="¿De dónde sale el equipo?">
                  <select value={origenLabel} onChange={(e) => setOrigenLabel(e.target.value)} style={inputStyle}>
                    <option value="">Elegir...</option>
                    {ORIGEN_LABELS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="¿A qué hora sale el equipo?">
                  <input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            </div>
            <AddressField
              label="Dirección de salida"
              value={origenDireccion}
              onChange={setOrigenDireccion}
              onResolved={(d) => {
                if (!d) return;
                setOrigenLat(d.lat); setOrigenLng(d.lng); setOrigenFullAddress(d.fullAddress ?? "");
              }}
              resolvedAddress={origenFullAddress || null}
            />

            {(venueLat != null && origenLat != null) && (
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Cronograma calculado
                </div>
                {calculatingRoute ? (
                  <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Calculando...</div>
                ) : routeMsg ? (
                  <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{routeMsg}</div>
                ) : (
                  <>
                    {duracionIdaMin && (
                      <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                        Tiempo de viaje: <strong style={{ color: "var(--text-1)" }}>{duracionIdaMin} min</strong>
                        {distanciaIdaKm ? ` (${distanciaIdaKm} km)` : ""}
                      </div>
                    )}
                    {horaLlegadaVenue && (
                      <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                        Llegada al venue sugerida: <strong style={{ color: "var(--text-1)" }}>{horaLlegadaVenue}</strong>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              2 · Punto de encuentro del equipo técnico
            </div>
            <Field label="¿Dónde se encuentra el equipo técnico?">
              <input value={puntoEncuentroNombre} onChange={(e) => setPuntoEncuentroNombre(e.target.value)} style={inputStyle} />
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 2 }}>
                <AddressField
                  label="Dirección del punto de encuentro"
                  value={puntoEncuentroDireccion}
                  onChange={setPuntoEncuentroDireccion}
                  onResolved={(d) => {
                    if (!d) return;
                    setPuntoEncuentroLat(d.lat); setPuntoEncuentroLng(d.lng); setPuntoEncuentroFullAddress(d.fullAddress ?? "");
                  }}
                  resolvedAddress={puntoEncuentroFullAddress || null}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Horario de encuentro">
                  <input type="time" value={horaEncuentroEquipo} onChange={(e) => setHoraEncuentroEquipo(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              3 · Búsqueda del artista
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 2 }}>
                <AddressField
                  label="¿Dónde pasan a buscar al artista?"
                  value={direccionBusquedaArtista}
                  onChange={setDireccionBusquedaArtista}
                  onResolved={(d) => {
                    if (!d) return;
                    setBusquedaArtistaLat(d.lat); setBusquedaArtistaLng(d.lng); setBusquedaArtistaFullAddress(d.fullAddress ?? "");
                  }}
                  resolvedAddress={busquedaArtistaFullAddress || null}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="¿A qué hora pasan a buscarlo?">
                  <input type="time" value={horaBusquedaArtista} onChange={(e) => setHoraBusquedaArtista(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              4 · Llegada y venue
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="¿A qué hora llegan a la ciudad?"><input type="time" value={horaLlegadaCiudad} onChange={(e) => setHoraLlegadaCiudad(e.target.value)} style={inputStyle} /></Field>
              <Field label="Llegada al venue"><input type="time" value={horaLlegadaVenue} onChange={(e) => setHoraLlegadaVenue(e.target.value)} style={inputStyle} /></Field>
              <Field label="Apertura de puertas"><input type="time" value={horaAperturaPuertas} onChange={(e) => setHoraAperturaPuertas(e.target.value)} style={inputStyle} /></Field>
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

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              5 · Prueba de sonido
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="¿A qué hora es la prueba de sonido?">
                  <input type="time" value={horaPruebaSonido} onChange={(e) => setHoraPruebaSonido(e.target.value)} style={inputStyle} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Duración estimada (min)">
                  <input type="number" value={duracionPruebaSonidoMin} onChange={(e) => setDuracionPruebaSonidoMin(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            </div>
            <Field label="¿Dónde se hace la prueba de sonido?">
              <input value={lugarPruebaSonido} onChange={(e) => setLugarPruebaSonido(e.target.value)} placeholder="Dejalo vacío si es el mismo lugar del show" style={inputStyle} />
            </Field>
            {lugarPruebaSonido.trim() && (
              <AddressField
                label="Dirección de la prueba de sonido (si es distinta al venue)"
                value={direccionPruebaSonido}
                onChange={setDireccionPruebaSonido}
                onResolved={(d) => {
                  if (!d) return;
                  setPruebaSonidoLat(d.lat); setPruebaSonidoLng(d.lng); setPruebaSonidoFullAddress(d.fullAddress ?? "");
                }}
                resolvedAddress={pruebaSonidoFullAddress || null}
              />
            )}

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              6 · Comida
            </div>
            <Field label="¿A qué hora es la cena o comida?">
              <input type="time" value={horaComida} onChange={(e) => setHoraComida(e.target.value)} style={inputStyle} />
            </Field>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              7 · Hotel
            </div>
            <Field label="¿Dónde se hospedan?">
              <input value={hotelNombre} onChange={(e) => setHotelNombre(e.target.value)} style={inputStyle} />
            </Field>
            <AddressField
              label="Dirección del hotel"
              value={hotelDireccion}
              onChange={setHotelDireccion}
              onResolved={(d) => {
                if (!d) return;
                setHotelLat(d.lat); setHotelLng(d.lng); setHotelFullAddress(d.fullAddress ?? "");
              }}
              resolvedAddress={hotelFullAddress || null}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Llegada estimada"><input type="time" value={horaLlegadaHotel} onChange={(e) => setHoraLlegadaHotel(e.target.value)} style={inputStyle} /></Field>
              <Field label="Check-in"><input type="time" value={horaCheckin} onChange={(e) => setHoraCheckin(e.target.value)} style={inputStyle} /></Field>
              <Field label="Check-out"><input type="time" value={horaCheckout} onChange={(e) => setHoraCheckout(e.target.value)} style={inputStyle} /></Field>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              Paradas intermedias
            </div>
            {paradas.map((p, i) => (
              <div key={i} style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Nombre de la parada">
                      <input value={p.nombre} onChange={(e) => updateParada(i, { nombre: e.target.value })} style={inputStyle} />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Horario">
                      <input type="time" value={p.hora ?? ""} onChange={(e) => updateParada(i, { hora: e.target.value || null })} style={inputStyle} />
                    </Field>
                  </div>
                  <button type="button" onClick={() => removeParada(i)} style={{ marginTop: 20, background: "transparent", border: "none", color: "var(--crit-ink)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
                <AddressField
                  label="Dirección"
                  value={p.direccion ?? ""}
                  onChange={(v) => updateParada(i, { direccion: v })}
                  onResolved={(d) => updateParada(i, { lat: d?.lat ?? null, lng: d?.lng ?? null, fullAddress: d?.fullAddress ?? null })}
                  resolvedAddress={p.fullAddress}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addParada}
              style={{ background: "transparent", border: "1px dashed var(--line-soft)", borderRadius: 8, padding: "8px 0", color: "var(--text-2)", fontSize: 12.5, cursor: "pointer" }}
            >
              + Agregar parada
            </button>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)", marginTop: 4 }}>
              8 · Regreso
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="¿A qué hora vuelven?"><input type="time" value={horaSalidaVenue} onChange={(e) => setHoraSalidaVenue(e.target.value)} style={inputStyle} /></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Llegada al destino final"><input type="time" value={horaLlegadaDestino} onChange={(e) => setHoraLlegadaDestino(e.target.value)} style={inputStyle} /></Field>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>
              Tiempo de anticipación y traslados
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Llegar al venue con cuánta anticipación">
                  <select value={bufferPreset} onChange={(e) => handleBufferPresetChange(e.target.value)} style={inputStyle}>
                    {BUFFER_PRESETS.map((p) => (
                      <option key={p.value} value={String(p.value)}>{p.label}</option>
                    ))}
                    <option value="custom">Personalizado</option>
                  </select>
                </Field>
              </div>
              {bufferPreset === "custom" && (
                <div style={{ flex: 1 }}>
                  <Field label="Minutos personalizados">
                    <input type="number" min={0} value={bufferPrepMin} onChange={(e) => setBufferPrepMin(e.target.value)} style={inputStyle} />
                  </Field>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <Field label="Km ida"><input type="number" step="0.1" value={distanciaIdaKm} onChange={(e) => setDistanciaIdaKm(e.target.value)} style={inputStyle} /></Field>
              <Field label="Min ida"><input type="number" value={duracionIdaMin} onChange={(e) => setDuracionIdaMin(e.target.value)} style={inputStyle} /></Field>
              <Field label="Km vuelta"><input type="number" step="0.1" value={distanciaVueltaKm} onChange={(e) => setDistanciaVueltaKm(e.target.value)} style={inputStyle} /></Field>
              <Field label="Min vuelta"><input type="number" value={duracionVueltaMin} onChange={(e) => setDuracionVueltaMin(e.target.value)} style={inputStyle} /></Field>
            </div>
            <Field label="Cantidad de personas en el traslado">
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
            <Field label="Observaciones generales">
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
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
