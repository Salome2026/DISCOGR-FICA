"use client";

import type { HojaDeRuta } from "@/lib/db/tourManager";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tm-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="tm-card-label">{title}</div>
      {children}
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 12 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}

// Todo el cuerpo cronológico de una hoja de ruta — mismo contenido para la
// vista interna (con Editar/Duplicar/Compartir) y para el link público de
// solo lectura, así ambos muestran exactamente la misma información.
export default function HojaSummary({ hoja }: { hoja: HojaDeRuta }) {
  const pruebaSonidoDistinta =
    (hoja.lugarPruebaSonido || hoja.direccionPruebaSonido) &&
    (hoja.pruebaSonidoLat !== hoja.venueLat || hoja.pruebaSonidoLng !== hoja.venueLng || hoja.lugarPruebaSonido !== hoja.venue);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      <Section title="Información general">
        <Row label="Artista" value={hoja.artistName} />
        <Row label="Evento" value={hoja.tipoEvento} />
        <Row label="Fecha" value={formatFecha(hoja.fecha)} />
        <Row label="Ciudad" value={hoja.venueCiudad} />
        <Row label="Provincia" value={hoja.venueProvincia} />
        <Row label="País" value={hoja.venuePais} />
      </Section>

      <Section title="1 · Salida del equipo">
        <Row label="Horario" value={hoja.horaSalida} />
        <Row label="Desde" value={hoja.origenLabel ?? hoja.origenFullAddress ?? hoja.origenDireccion} />
      </Section>

      {(hoja.puntoEncuentroNombre || hoja.horaEncuentroEquipo) && (
        <Section title="2 · Punto de encuentro del equipo">
          <Row label="Horario" value={hoja.horaEncuentroEquipo} />
          <Row label="Lugar" value={hoja.puntoEncuentroNombre} />
          <Row label="Dirección" value={hoja.puntoEncuentroFullAddress ?? hoja.puntoEncuentroDireccion} />
        </Section>
      )}

      {(hoja.horaBusquedaArtista || hoja.direccionBusquedaArtista) && (
        <Section title="3 · Búsqueda del artista">
          <Row label="Horario" value={hoja.horaBusquedaArtista} />
          <Row label="Dirección" value={hoja.busquedaArtistaFullAddress ?? hoja.direccionBusquedaArtista} />
        </Section>
      )}

      <Section title="4 · Llegada y venue">
        <Row label="Llegada a la ciudad" value={hoja.horaLlegadaCiudad} />
        <Row label="Llegada al venue" value={hoja.horaLlegadaVenue} />
        <Row label="Apertura de puertas" value={hoja.horaAperturaPuertas} />
        <Row label="Nombre" value={hoja.venue} />
        <Row label="Dirección" value={hoja.venueFullAddress ?? hoja.venueDireccion} />
        <Row label="Contacto" value={hoja.venueContactoNombre} />
        <Row label="Teléfono" value={hoja.venueContactoTelefono} />
        <Row label="Duración del show" value={hoja.duracionShowMin ? `${hoja.duracionShowMin} min` : null} />
      </Section>

      {(hoja.horaPruebaSonido || hoja.lugarPruebaSonido) && (
        <Section title="5 · Prueba de sonido">
          <Row label="Horario" value={hoja.horaPruebaSonido} />
          <Row label="Duración estimada" value={hoja.duracionPruebaSonidoMin ? `${hoja.duracionPruebaSonidoMin} min` : null} />
          <Row label="Lugar" value={pruebaSonidoDistinta ? hoja.lugarPruebaSonido : "Mismo lugar que el show"} />
          {pruebaSonidoDistinta && <Row label="Dirección" value={hoja.pruebaSonidoFullAddress ?? hoja.direccionPruebaSonido} />}
        </Section>
      )}

      {hoja.horaComida && (
        <Section title="6 · Comida">
          <Row label="Horario" value={hoja.horaComida} />
        </Section>
      )}

      {(hoja.hotelNombre || hoja.horaLlegadaHotel) && (
        <Section title="7 · Hotel">
          <Row label="Nombre" value={hoja.hotelNombre} />
          <Row label="Dirección" value={hoja.hotelFullAddress ?? hoja.hotelDireccion} />
          <Row label="Llegada estimada" value={hoja.horaLlegadaHotel} />
          <Row label="Check-in" value={hoja.horaCheckin} />
          <Row label="Check-out" value={hoja.horaCheckout} />
        </Section>
      )}

      {hoja.paradas.length > 0 && (
        <Section title="Paradas intermedias">
          {hoja.paradas.map((p, i) => (
            <Row key={`${p.nombre}-${i}`} label={p.hora ?? `Parada ${i + 1}`} value={[p.nombre, p.fullAddress ?? p.direccion].filter(Boolean).join(" — ")} />
          ))}
        </Section>
      )}

      <Section title="8 · Regreso">
        <Row label="Salida del venue" value={hoja.horaSalidaVenue} />
        <Row label="Llegada a destino" value={hoja.horaLlegadaDestino} />
      </Section>

      <Section title="Traslados">
        <Row label="Pax" value={hoja.pax != null ? String(hoja.pax) : null} />
        <Row label="Driver" value={hoja.driverNombre} />
        <Row label="Tel. driver" value={hoja.driverTelefono} />
      </Section>

      <Section title="Contactos">
        <Row label="Contacto artista" value={hoja.contactoArtistaNombre} />
        <Row label="Tel. artista" value={hoja.contactoArtistaTelefono} />
        <Row label="Artist Liaison" value={hoja.artistLiaisonNombre} />
        <Row label="Tel. liaison" value={hoja.artistLiaisonTelefono} />
      </Section>

      <Section title="Distancias">
        <Row label="Origen → Venue" value={hoja.distanciaIdaKm != null || hoja.duracionIdaMin != null ? `${hoja.duracionIdaMin ?? "—"} min (${hoja.distanciaIdaKm ?? "—"} km)` : null} />
        <Row label="Venue → Origen" value={hoja.distanciaVueltaKm != null || hoja.duracionVueltaMin != null ? `${hoja.duracionVueltaMin ?? "—"} min (${hoja.distanciaVueltaKm ?? "—"} km)` : null} />
      </Section>

      {hoja.runningOrder && (
        <Section title="Running Order">
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{hoja.runningOrder}</div>
        </Section>
      )}

      {hoja.notas && (
        <Section title="Observaciones generales">
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{hoja.notas}</div>
        </Section>
      )}
    </div>
  );
}
