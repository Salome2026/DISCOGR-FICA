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
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 4 },
  rowLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { fontSize: 9, color: GRAY },
  rowValue: { fontSize: 9.5, color: INK, fontFamily: "Helvetica-Bold", textAlign: "right", maxWidth: "60%" },
  freeText: { fontSize: 9.5, color: INK, lineHeight: 1.5 },
  mapsLink: { fontSize: 8.5, color: TEAL, marginTop: 4 },

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

export default function HojaDeRutaDoc({ hoja, artistPhotoUrl }: { hoja: HojaDeRuta; artistPhotoUrl?: string | null }) {
  const hasOrigen = hoja.origenLat != null && hoja.origenLng != null;
  const hasVenue = hoja.venueLat != null && hoja.venueLng != null;
  const mapsUrl =
    hasOrigen && hasVenue
      ? `https://www.google.com/maps/dir/?api=1&origin=${hoja.origenLat},${hoja.origenLng}&destination=${hoja.venueLat},${hoja.venueLng}&travelmode=driving`
      : null;

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
              {formatFecha(hoja.fecha)}
              {hoja.horaShow ? ` · ${hoja.horaShow} hs` : ""}
            </Text>
          </View>
          {artistPhotoUrl ? <Image src={artistPhotoUrl} style={styles.photo} /> : null}
        </View>
        <View style={styles.hRule} />

        <View style={styles.grid}>
          <Section label="Información general">
            <Row label="Artista" value={hoja.artistName} />
            <Row label="Evento" value={hoja.tipoEvento} />
            <Row label="Fecha" value={formatFecha(hoja.fecha)} />
            <Row label="Ciudad" value={hoja.venueCiudad} />
            <Row label="País" value={hoja.venuePais} last />
          </Section>

          <Section label="Venue">
            <Row label="Nombre" value={hoja.venue} />
            <Row label="Dirección" value={hoja.venueFullAddress ?? hoja.venueDireccion} />
            <Row label="Contacto" value={hoja.venueContactoNombre} />
            <Row label="Teléfono" value={hoja.venueContactoTelefono} />
            <Row label="Duración del show" value={hoja.duracionShowMin ? `${hoja.duracionShowMin} min` : null} last />
          </Section>

          <Section label="Cronograma de traslados">
            <Row label="Salida" value={hoja.horaSalida ? `${hoja.horaSalida} (${hoja.origenLabel ?? hoja.origenDireccion ?? "origen"})` : null} />
            <Row label="Llegada al venue" value={hoja.horaLlegadaVenue} />
            <Row label="Presentación" value={hoja.horaShow} />
            <Row label="Salida del venue" value={hoja.horaSalidaVenue} />
            <Row label="Llegada a destino" value={hoja.horaLlegadaDestino} last />
          </Section>

          <Section label="Traslados detallados">
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
            {mapsUrl && <Link src={mapsUrl} style={styles.mapsLink}>Ver recorrido en Google Maps</Link>}
          </Section>

          {hoja.runningOrder && (
            <Section label="Running Order" full>
              <Text style={styles.freeText}>{sanitizePdfText(hoja.runningOrder)}</Text>
            </Section>
          )}

          {hoja.notas && (
            <Section label="Notas" full>
              <Text style={styles.freeText}>{sanitizePdfText(hoja.notas)}</Text>
            </Section>
          )}
        </View>

        <Footer artist={hoja.artistName} />
      </Page>
    </Document>
  );
}
