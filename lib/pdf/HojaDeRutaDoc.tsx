import React from "react";
import { Document, Page, Text, View, StyleSheet, Link, Image, Font } from "@react-pdf/renderer";
import type { HojaDeRuta } from "@/lib/db/tourManager";
import { sanitizePdfText } from "@/lib/pdf/textUtils";

Font.registerHyphenationCallback((word: string) => [word]);

// Same visual language as lib/pdf/PlanPersonalizadoDoc.tsx — one shared
// "brand" for every generated PDF in the app.
const TEAL = "#2a8c94";
const INK = "#15161a";
const GRAY = "#5a5d68";
const LIGHT = "#eef0f2";
const LINE = "#dcdfe3";

const styles = StyleSheet.create({
  page: { padding: "40 44 50", fontSize: 10.5, fontFamily: "Helvetica", color: INK, lineHeight: 1.4 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  kicker: { fontSize: 9, color: TEAL, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 4 },
  subtitle: { fontSize: 10.5, color: GRAY },
  photo: { width: 56, height: 56, borderRadius: 8, objectFit: "cover" },
  hRule: { height: 2, backgroundColor: TEAL, width: 40, marginBottom: 18 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  section: { width: "48%", backgroundColor: LIGHT, borderRadius: 6, padding: 12, marginBottom: 10 },
  sectionFull: { width: "100%", backgroundColor: LIGHT, borderRadius: 6, padding: 12, marginBottom: 10 },
  sectionLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 4, gap: 8 },
  rowLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, gap: 8 },
  rowLabel: { fontSize: 9, color: GRAY, maxWidth: "44%" },
  rowValue: { fontSize: 9.5, color: INK, fontFamily: "Helvetica-Bold", textAlign: "right", maxWidth: "60%" },
  freeText: { fontSize: 9.5, color: INK, lineHeight: 1.5 },
  mapsLink: { fontSize: 8.5, color: TEAL, marginTop: 4 },
  mapImage: { width: "100%", height: 260, borderRadius: 6, marginBottom: 14, objectFit: "cover" },
  warnBox: { backgroundColor: "#fbeeea", borderRadius: 6, padding: "8 12", marginBottom: 12 },
  warnText: { fontSize: 8.5, color: "#9a4a2e" },

  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9a9da8", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

function Row({ label, value, last }: { label: string; value: string | null | undefined; last?: boolean }) {
  if (!value) return null;
  return (
    <View style={last ? styles.rowLast : styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{sanitizePdfText(value)}</Text>
    </View>
  );
}

function Section({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <View style={full ? styles.sectionFull : styles.section} wrap={false}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function Footer({ artist }: { artist: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Hoja de Ruta · {artist}</Text>
      <Text render={({ pageNumber }) => `Página ${pageNumber}`} />
    </View>
  );
}

// What's genuinely missing, phrased the way point 10 of the spec asks for
// ("Falta cargar el horario de prueba de sonido") — shown once at the top
// so nobody has to hunt through sections to notice a gap.
function missingWarnings(hoja: HojaDeRuta): string[] {
  const warnings: string[] = [];
  if (!hoja.horaSalida) warnings.push("Falta cargar el horario de salida del equipo.");
  if (!hoja.venueFullAddress && !hoja.venueDireccion) warnings.push("Falta cargar la dirección del show.");
  if (hoja.horaPruebaSonido == null && hoja.lugarPruebaSonido == null) warnings.push("Falta cargar la prueba de sonido.");
  if (!hoja.hotelNombre) warnings.push("Falta cargar el hotel.");
  if (hoja.venueLat == null || hoja.venueLng == null) warnings.push("No se pudo ubicar el lugar del show en el mapa.");
  return warnings;
}

export default function HojaDeRutaDoc({
  hoja,
  artistPhotoUrl,
  mapImageDataUri,
}: {
  hoja: HojaDeRuta;
  artistPhotoUrl?: string | null;
  mapImageDataUri?: string | null;
}) {
  const hasOrigen = hoja.origenLat != null && hoja.origenLng != null;
  const hasVenue = hoja.venueLat != null && hoja.venueLng != null;
  const mapsUrl =
    hasOrigen && hasVenue
      ? `https://www.google.com/maps/dir/?api=1&origin=${hoja.origenLat},${hoja.origenLng}&destination=${hoja.venueLat},${hoja.venueLng}&travelmode=driving`
      : null;
  const warnings = missingWarnings(hoja);
  const pruebaSonidoDistinta =
    (hoja.lugarPruebaSonido || hoja.direccionPruebaSonido) &&
    (hoja.pruebaSonidoLat !== hoja.venueLat || hoja.pruebaSonidoLng !== hoja.venueLng || hoja.lugarPruebaSonido !== hoja.venue);

  return (
    <Document title={`Hoja de Ruta — ${hoja.artistName}`} author="VPO Corp">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>VPO Corp · Tour Manager</Text>
            <Text style={styles.title}>{sanitizePdfText(hoja.artistName)}</Text>
            <Text style={styles.subtitle}>
              Itinerario y Hospitality{hoja.tipoEvento ? ` — ${hoja.tipoEvento}` : ""}
              {"\n"}
              {formatFecha(hoja.fecha)} · {sanitizePdfText([hoja.venueCiudad, hoja.venueProvincia].filter(Boolean).join(", ") || "")}
              {hoja.horaShow ? ` · Show ${hoja.horaShow} hs` : ""}
            </Text>
          </View>
          {artistPhotoUrl ? <Image src={artistPhotoUrl} style={styles.photo} /> : null}
        </View>
        <View style={styles.hRule} />

        {mapImageDataUri && <Image src={mapImageDataUri} style={styles.mapImage} />}
        {mapsUrl && (
          <Link src={mapsUrl} style={[styles.mapsLink, { marginBottom: 12 }]}>
            Ver recorrido en Google Maps
          </Link>
        )}

        {warnings.length > 0 && (
          <View style={styles.warnBox} wrap={false}>
            {warnings.map((w) => (
              <Text key={w} style={styles.warnText}>
                ⚠ {w}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.grid}>
          <Section label="Información general">
            <Row label="Artista" value={hoja.artistName} />
            <Row label="Evento" value={hoja.tipoEvento} />
            <Row label="Fecha" value={formatFecha(hoja.fecha)} />
            <Row label="Ciudad" value={hoja.venueCiudad} />
            <Row label="Provincia" value={hoja.venueProvincia} />
            <Row label="País" value={hoja.venuePais} last />
          </Section>

          <Section label="1 · Salida del equipo">
            <Row label="Horario de salida" value={hoja.horaSalida} />
            <Row label="Desde" value={hoja.origenLabel ?? hoja.origenFullAddress ?? hoja.origenDireccion} last />
          </Section>

          {(hoja.puntoEncuentroNombre || hoja.horaEncuentroEquipo) && (
            <Section label="2 · Punto de encuentro del equipo">
              <Row label="Horario" value={hoja.horaEncuentroEquipo} />
              <Row label="Lugar" value={hoja.puntoEncuentroNombre} />
              <Row label="Dirección" value={hoja.puntoEncuentroFullAddress ?? hoja.puntoEncuentroDireccion} last />
            </Section>
          )}

          {(hoja.horaBusquedaArtista || hoja.direccionBusquedaArtista) && (
            <Section label="3 · Búsqueda del artista">
              <Row label="Horario" value={hoja.horaBusquedaArtista} />
              <Row label="Dirección" value={hoja.busquedaArtistaFullAddress ?? hoja.direccionBusquedaArtista} last />
            </Section>
          )}

          <Section label="4 · Llegada y venue">
            <Row label="Llegada a la ciudad" value={hoja.horaLlegadaCiudad} />
            <Row label="Llegada al venue" value={hoja.horaLlegadaVenue} />
            <Row label="Nombre" value={hoja.venue} />
            <Row label="Dirección" value={hoja.venueFullAddress ?? hoja.venueDireccion} />
            <Row label="Contacto" value={hoja.venueContactoNombre} />
            <Row label="Teléfono" value={hoja.venueContactoTelefono} last />
          </Section>

          {(hoja.horaPruebaSonido || hoja.lugarPruebaSonido) && (
            <Section label="5 · Prueba de sonido">
              <Row label="Horario" value={hoja.horaPruebaSonido} />
              <Row label="Duración estimada" value={hoja.duracionPruebaSonidoMin ? `${hoja.duracionPruebaSonidoMin} min` : null} />
              {pruebaSonidoDistinta ? (
                <>
                  <Row label="Lugar" value={hoja.lugarPruebaSonido} />
                  <Row label="Dirección" value={hoja.pruebaSonidoFullAddress ?? hoja.direccionPruebaSonido} last />
                </>
              ) : (
                <Row label="Lugar" value="Mismo lugar que el show" last />
              )}
            </Section>
          )}

          {hoja.horaComida && (
            <Section label="6 · Comida">
              <Row label="Horario" value={hoja.horaComida} last />
            </Section>
          )}

          <Section label="7 · Show">
            <Row label="Apertura de puertas" value={hoja.horaAperturaPuertas} />
            <Row label="Horario del show" value={hoja.horaShow} />
            <Row label="Duración" value={hoja.duracionShowMin ? `${hoja.duracionShowMin} min` : null} last />
          </Section>

          {(hoja.hotelNombre || hoja.horaLlegadaHotel) && (
            <Section label="8 · Hotel">
              <Row label="Nombre" value={hoja.hotelNombre} />
              <Row label="Dirección" value={hoja.hotelFullAddress ?? hoja.hotelDireccion} />
              <Row label="Llegada estimada" value={hoja.horaLlegadaHotel} />
              <Row label="Check-in" value={hoja.horaCheckin} />
              <Row label="Check-out" value={hoja.horaCheckout} last />
            </Section>
          )}

          {hoja.paradas.length > 0 && (
            <Section label="Paradas intermedias" full>
              {hoja.paradas.map((p, i) => (
                <Row
                  key={`${p.nombre}-${i}`}
                  label={p.hora ?? `Parada ${i + 1}`}
                  value={[p.nombre, p.fullAddress ?? p.direccion].filter(Boolean).join(" — ")}
                  last={i === hoja.paradas.length - 1}
                />
              ))}
            </Section>
          )}

          <Section label="9 · Regreso">
            <Row label="Salida del venue" value={hoja.horaSalidaVenue} />
            <Row label="Llegada a destino" value={hoja.horaLlegadaDestino} last />
          </Section>

          <Section label="Traslados">
            <Row label="Pax" value={hoja.pax != null ? String(hoja.pax) : null} />
            <Row label="Driver" value={hoja.driverNombre} />
            <Row label="Tel. driver" value={hoja.driverTelefono} last />
          </Section>

          <Section label="Contactos">
            <Row label="Contacto artista" value={hoja.contactoArtistaNombre} />
            <Row label="Tel. artista" value={hoja.contactoArtistaTelefono} />
            <Row label="Artist Liaison" value={hoja.artistLiaisonNombre} />
            <Row label="Tel. liaison" value={hoja.artistLiaisonTelefono} last />
          </Section>

          <Section label="Distancias">
            <Row
              label="Origen -> Venue"
              value={hoja.distanciaIdaKm != null || hoja.duracionIdaMin != null ? `${hoja.duracionIdaMin ?? "-"} min (${hoja.distanciaIdaKm ?? "-"} km)` : null}
            />
            <Row
              label="Venue -> Origen"
              value={hoja.distanciaVueltaKm != null || hoja.duracionVueltaMin != null ? `${hoja.duracionVueltaMin ?? "-"} min (${hoja.distanciaVueltaKm ?? "-"} km)` : null}
              last
            />
          </Section>

          {hoja.runningOrder && (
            <Section label="Running Order" full>
              <Text style={styles.freeText}>{sanitizePdfText(hoja.runningOrder)}</Text>
            </Section>
          )}

          {hoja.notas && (
            <Section label="Observaciones generales" full>
              <Text style={styles.freeText}>{sanitizePdfText(hoja.notas)}</Text>
            </Section>
          )}
        </View>

        <Footer artist={hoja.artistName} />
      </Page>
    </Document>
  );
}
