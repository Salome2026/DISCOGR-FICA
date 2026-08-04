import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MarketingPlanAI, MarketingPlanInput } from "@/lib/gemini";

const TEAL = "#2a8c94";
const INK = "#15161a";
const GRAY = "#5a5d68";
const LIGHT = "#eef0f2";
const LINE = "#dcdfe3";

const styles = StyleSheet.create({
  coverPage: { padding: 0, backgroundColor: INK },
  coverInner: { flex: 1, padding: 56, justifyContent: "space-between" },
  coverKicker: { fontSize: 11, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 },
  coverTitle: { fontSize: 30, color: "#ffffff", fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 14 },
  coverMeta: { fontSize: 12, color: "#b7bac2", lineHeight: 1.7 },
  coverBar: { width: 46, height: 4, backgroundColor: TEAL, marginBottom: 22 },
  coverFooter: { fontSize: 9.5, color: "#8b8e97" },
  page: { padding: "48 44 56", fontSize: 10.5, fontFamily: "Helvetica", color: INK, lineHeight: 1.45 },
  resumenBox: { backgroundColor: LIGHT, borderRadius: 6, padding: 16, marginBottom: 6 },
  resumenLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" },
  resumenText: { fontSize: 11, color: INK, lineHeight: 1.55 },
  h1Num: { fontSize: 10, color: TEAL, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 6 },
  h1: { fontSize: 17, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 4 },
  h1Rule: { height: 2, backgroundColor: TEAL, width: 28, marginBottom: 14, marginTop: 2 },
  p: { fontSize: 10, color: GRAY, marginBottom: 8, lineHeight: 1.5 },
  bullet: { flexDirection: "row", marginBottom: 5, paddingRight: 4 },
  bulletDot: { width: 10, fontSize: 10, color: TEAL, fontFamily: "Helvetica-Bold" },
  bulletText: { flex: 1, fontSize: 10, color: GRAY, lineHeight: 1.45 },
  kpiRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 7 },
  kpiRowHead: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: INK, paddingVertical: 6 },
  kpiName: { width: 170, fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK },
  kpiTarget: { width: 170, fontSize: 9.5, color: TEAL },
  kpiFreq: { flex: 1, fontSize: 9.5, color: GRAY },
  kpiHeadText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK, textTransform: "uppercase", letterSpacing: 0.5 },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9a9da8", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

function Footer({ artist }: { artist: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Plan de Marketing Personalizado · {artist}</Text>
      <Text render={({ pageNumber }) => `${pageNumber}`} />
    </View>
  );
}

export default function PlanPersonalizadoDoc({
  input,
  plan,
}: {
  input: MarketingPlanInput;
  plan: MarketingPlanAI;
}) {
  const featuringStr = input.featuring.length ? ` feat. ${input.featuring.join(", ")}` : "";

  return (
    <Document title={`Plan de Marketing — ${input.artist} — ${input.fonograma}`} author="VPO Corp">
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverInner}>
          <View>
            <Text style={styles.coverKicker}>VPO Corp · Plan personalizado con IA</Text>
            <View style={styles.coverBar} />
            <Text style={styles.coverTitle}>
              {input.artist}
              {featuringStr}
              {"\n"}"{input.fonograma}"
            </Text>
            <Text style={styles.coverMeta}>
              Género: {input.genero}
              {"\n"}Sello: {input.sello ?? "s/d"}
              {"\n"}Fecha de lanzamiento: {input.fecha ?? "s/d"}
              {"\n"}
              {input.presupuesto.tiene
                ? `Presupuesto: $${input.presupuesto.montoArs.toLocaleString("es-AR")} ARS`
                : "Estrategia 100% orgánica"}
            </Text>
          </View>
          <Text style={styles.coverFooter}>
            Generado el {new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.resumenBox}>
          <Text style={styles.resumenLabel}>Resumen estratégico</Text>
          <Text style={styles.resumenText}>{plan.resumenEstrategico}</Text>
        </View>

        {plan.secciones.map((s, i) => (
          <View key={i} wrap={false} style={{ marginTop: 16 }}>
            <Text style={styles.h1Num}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={styles.h1}>{s.titulo}</Text>
            <View style={styles.h1Rule} />
            {s.parrafo ? <Text style={styles.p}>{s.parrafo}</Text> : null}
            {s.bullets.map((b, bi) => (
              <View style={styles.bullet} key={bi}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        {plan.kpis.length > 0 && (
          <View wrap={false} style={{ marginTop: 18 }}>
            <Text style={styles.h1Num}>KPIS</Text>
            <Text style={styles.h1}>KPIs Recomendados</Text>
            <View style={styles.h1Rule} />
            <View style={styles.kpiRowHead}>
              <Text style={[styles.kpiHeadText, { width: 170 }]}>Métrica</Text>
              <Text style={[styles.kpiHeadText, { width: 170 }]}>Objetivo</Text>
              <Text style={styles.kpiHeadText}>Frecuencia</Text>
            </View>
            {plan.kpis.map((k, i) => (
              <View style={styles.kpiRow} key={i}>
                <Text style={styles.kpiName}>{k.nombre}</Text>
                <Text style={styles.kpiTarget}>{k.objetivo}</Text>
                <Text style={styles.kpiFreq}>{k.frecuencia}</Text>
              </View>
            ))}
          </View>
        )}
        <Footer artist={input.artist} />
      </Page>
    </Document>
  );
}
