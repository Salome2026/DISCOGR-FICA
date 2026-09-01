import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { HojaGenerica } from "@discografica/shared/types/tourManager";
import { sanitizePdfText } from "@/lib/pdf/textUtils";

Font.registerHyphenationCallback((word: string) => [word]);

// Same brand as lib/pdf/HojaDeRutaDoc.tsx / PlanPersonalizadoDoc.tsx.
const TEAL = "#2a8c94";
const INK = "#15161a";
const GRAY = "#5a5d68";
const LIGHT = "#eef0f2";
const LINE = "#dcdfe3";

const styles = StyleSheet.create({
  page: { padding: "40 44 50", fontSize: 10.5, fontFamily: "Helvetica", color: INK, lineHeight: 1.4 },
  kicker: { fontSize: 9, color: TEAL, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  // marginBottom needs real room below a 22px bold title, not just 4px — a
  // name with descenders (g, y, p, q, j) reaches low enough to visually
  // collide with the subtitle line directly under it otherwise.
  title: { fontSize: 22, lineHeight: 1.3, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 10 },
  subtitle: { fontSize: 10.5, color: GRAY, marginBottom: 16 },
  hRule: { height: 2, backgroundColor: TEAL, width: 40, marginBottom: 18 },

  table: { borderWidth: 1, borderColor: LINE, borderRadius: 6, overflow: "hidden" },
  headerRow: { flexDirection: "row", backgroundColor: LIGHT, paddingVertical: 6, paddingHorizontal: 8 },
  headerCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 0.5, textTransform: "uppercase" },
  bodyRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: LINE, paddingVertical: 8, paddingHorizontal: 8 },
  cell: { fontSize: 9.5, color: INK },
  cellMuted: { fontSize: 8.5, color: GRAY, marginTop: 2 },

  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9a9da8", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default function HojaGenericaDoc({ hoja }: { hoja: HojaGenerica }) {
  const cols = { fecha: "13%", hora: "10%", busqueda: "27%", venue: "27%", recorrido: "23%" };
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.kicker}>VPO Corp · Tour Manager</Text>
        <Text style={styles.title}>{sanitizePdfText(hoja.artistName)}</Text>
        <Text style={styles.subtitle}>{sanitizePdfText(hoja.nombre || "Hoja de ruta genérica")} · {hoja.shows.length} show{hoja.shows.length === 1 ? "" : "s"}</Text>
        <View style={styles.hRule} />

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, { width: cols.fecha }]}>Fecha</Text>
            <Text style={[styles.headerCell, { width: cols.hora }]}>Hora</Text>
            <Text style={[styles.headerCell, { width: cols.busqueda }]}>Búsqueda del artista</Text>
            <Text style={[styles.headerCell, { width: cols.venue }]}>Venue</Text>
            <Text style={[styles.headerCell, { width: cols.recorrido }]}>Recorrido</Text>
          </View>
          {hoja.shows.map((s, i) => (
            <View key={i} style={styles.bodyRow} wrap={false}>
              <Text style={[styles.cell, { width: cols.fecha }]}>{formatFecha(s.fecha)}</Text>
              <Text style={[styles.cell, { width: cols.hora }]}>{s.horaShow ?? "—"}</Text>
              <View style={{ width: cols.busqueda }}>
                <Text style={styles.cell}>{sanitizePdfText(s.busquedaFullAddress ?? s.busquedaDireccion ?? "—")}</Text>
              </View>
              <View style={{ width: cols.venue }}>
                <Text style={styles.cell}>{sanitizePdfText(s.venue ?? "—")}</Text>
                {(s.venueFullAddress ?? s.venueDireccion) && (
                  <Text style={styles.cellMuted}>{sanitizePdfText(s.venueFullAddress ?? s.venueDireccion ?? "")}</Text>
                )}
              </View>
              <Text style={[styles.cell, { width: cols.recorrido }]}>
                {s.distanciaKm != null ? `${s.distanciaKm} km · ${s.duracionMin} min` : "s/d"}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Hoja Genérica · {hoja.artistName}</Text>
          <Text render={({ pageNumber }) => `Página ${pageNumber}`} />
        </View>
      </Page>
    </Document>
  );
}
