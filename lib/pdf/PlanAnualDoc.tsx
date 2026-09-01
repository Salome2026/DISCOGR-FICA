import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { sanitizePdfText } from "@/lib/pdf/textUtils";

Font.registerHyphenationCallback((word: string) => [word]);

const TEAL = "#2a8c94";
const INK = "#15161a";
const GRAY = "#5a5d68";
const LIGHT = "#eef0f2";
const LINE = "#dcdfe3";

const styles = StyleSheet.create({
  coverPage: { padding: 0, backgroundColor: INK },
  coverInner: { flex: 1, padding: 56, justifyContent: "space-between" },
  coverKicker: { fontSize: 11, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 },
  coverPhoto: { width: 96, height: 96, borderRadius: 48, objectFit: "cover", marginBottom: 20 },
  coverTitle: { fontSize: 30, color: "#ffffff", fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 14 },
  coverMeta: { fontSize: 12, color: "#b7bac2", lineHeight: 1.7 },
  coverBar: { width: 46, height: 4, backgroundColor: TEAL, marginBottom: 22 },
  coverFooter: { fontSize: 9.5, color: "#8b8e97" },

  page: { padding: "48 44 56", fontSize: 10.5, fontFamily: "Helvetica", color: INK, lineHeight: 1.45 },
  h1Num: { fontSize: 10, color: TEAL, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 6 },
  h1: { fontSize: 17, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 4 },
  h1Rule: { height: 2, backgroundColor: TEAL, width: 28, marginBottom: 14, marginTop: 2 },
  p: { fontSize: 10, color: GRAY, marginBottom: 8, lineHeight: 1.5 },

  box: { backgroundColor: LIGHT, borderRadius: 6, padding: 14, marginBottom: 10 },
  boxLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" },
  boxText: { fontSize: 10, color: INK, lineHeight: 1.5 },

  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 10, fontSize: 10, color: TEAL },
  bulletText: { flex: 1, fontSize: 10, color: INK, lineHeight: 1.4 },

  tableHeadRow: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: INK, paddingVertical: 6 },
  tableHeadText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: INK, textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 7 },
  colMes: { width: 60 },
  colLanzamiento: { width: 150, paddingRight: 8 },
  colAcciones: { flex: 1 },
  cellText: { fontSize: 9, color: GRAY, lineHeight: 1.4 },
  cellTextBold: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK },

  launchCard: { backgroundColor: "#fafafb", borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12, marginBottom: 10 },
  launchTitle: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 },
  launchMeta: { fontSize: 9, color: TEAL, marginBottom: 6 },
  actionRow: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, marginTop: 6 },
  actionTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 2 },
  actionMetaRow: { flexDirection: "row", gap: 14, marginTop: 2 },
  actionMetaLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 0.5, textTransform: "uppercase" },
  actionMetaValue: { fontSize: 9, color: GRAY },

  quarterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quarterBox: { width: "48%", backgroundColor: LIGHT, borderRadius: 6, padding: 12, marginBottom: 10 },
  quarterTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: TEAL, marginBottom: 6, textTransform: "uppercase" },

  observacionesArea: { borderWidth: 1, borderStyle: "dashed", borderColor: LINE, borderRadius: 6, minHeight: 160, padding: 14 },

  footer: { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9a9da8", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function formatFecha(fecha: string | null): string {
  if (!fecha) return "s/d";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function monthName(fecha: string): string {
  return MESES[Number(fecha.slice(5, 7)) - 1] ?? fecha;
}

function Footer({ artist }: { artist: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Plan Anual · {artist}</Text>
      <Text render={({ pageNumber }) => `Página ${pageNumber}`} />
    </View>
  );
}

export type PlanAnualDocLaunch = { id: number; titulo: string; fechaObjetivo: string; objetivo: string | null };
export type PlanAnualDocAction = {
  id: number; launchId: number | null; actionType: string; customLabel: string | null;
  descripcion: string | null; responsable: string | null; fechaLimite: string | null; estado: string;
};
export type PlanAnualDocQuarterlyReview = {
  quarter: string; fecha: string | null; observacionesPm: string | null; observacionesManagement: string | null;
};
export type PlanAnualDocPlan = {
  periodStart: string | null; periodEnd: string | null; objetivoGeneral: string | null;
  objetivosEspecificos: string[]; cantidadLanzamientosProyectados: number | null;
  metasYResultados: string | null; presupuestoEstimado: number | null; resumenEjecutivo: string | null;
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  plan_marketing: "Crear un plan de marketing",
  estrategia_contenido: "Definir una estrategia de contenido",
  sesiones_estudio: "Coordinar sesiones de estudio",
  contacto_colaboracion: "Contactar a un líder o referente para una colaboración",
  gestion_featuring: "Buscar y gestionar un featuring",
  contacto_prensa: "Contactar al equipo de prensa",
  contacto_comercial: "Contactar al área comercial para conseguir marcas o patrocinadores",
  gestion_medios: "Gestionar medios de comunicación",
  produccion_audiovisual: "Coordinar producción audiovisual",
  videoclip_contenido_redes: "Planificar videoclip, visualizer o contenido para redes",
  estrategia_playlists: "Crear una estrategia de playlists",
  branding_storytelling: "Trabajar branding, estética y storytelling",
  activaciones_shows: "Organizar activaciones, shows o presentaciones",
  personalizada: "Acción personalizada",
};
function actionLabel(a: PlanAnualDocAction): string {
  if (a.actionType === "personalizada") return a.customLabel?.trim() || "Acción personalizada";
  return ACTION_TYPE_LABELS[a.actionType] ?? a.actionType;
}

export default function PlanAnualDoc({
  artistName, artistPhotoUrl, pmName, plan, launches, actions, quarterlyReviews,
}: {
  artistName: string;
  artistPhotoUrl: string | null;
  pmName: string;
  plan: PlanAnualDocPlan | null;
  launches: PlanAnualDocLaunch[];
  actions: PlanAnualDocAction[];
  quarterlyReviews: PlanAnualDocQuarterlyReview[];
}) {
  const t = sanitizePdfText;
  const sortedLaunches = [...launches].sort((a, b) => a.fechaObjetivo.localeCompare(b.fechaObjetivo));
  const actionsByLaunch = (launchId: number) => actions.filter((a) => a.launchId === launchId);
  const generalActions = actions.filter((a) => a.launchId === null);

  return (
    <Document title={`Plan Anual — ${artistName}`} author="VPO Corp">
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverInner}>
          <View>
            <Text style={styles.coverKicker}>VPO Corp · Plan Anual</Text>
            <View style={styles.coverBar} />
            {artistPhotoUrl ? <Image src={artistPhotoUrl} style={styles.coverPhoto} /> : null}
            <Text style={styles.coverTitle}>{t(artistName)}</Text>
            <Text style={styles.coverMeta}>
              PM responsable: {t(pmName)}
              {"\n"}Período: {plan?.periodStart && plan?.periodEnd ? `${formatFecha(plan.periodStart)} - ${formatFecha(plan.periodEnd)}` : "Sin definir"}
            </Text>
          </View>
          <Text style={styles.coverFooter}>
            Generado el {new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View wrap={false}>
          <Text style={styles.h1Num}>01</Text>
          <Text style={styles.h1}>Objetivo general y objetivos específicos</Text>
          <View style={styles.h1Rule} />
        </View>
        <View style={styles.box}>
          <Text style={styles.boxLabel}>Objetivo general del año</Text>
          <Text style={styles.boxText}>{plan?.objetivoGeneral ? t(plan.objetivoGeneral) : "No disponible."}</Text>
        </View>
        {plan?.objetivosEspecificos && plan.objetivosEspecificos.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            {plan.objetivosEspecificos.map((o, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{t(o)}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={[styles.box, { flex: 1 }]}>
            <Text style={styles.boxLabel}>Lanzamientos proyectados</Text>
            <Text style={styles.boxText}>{plan?.cantidadLanzamientosProyectados ?? "s/d"}</Text>
          </View>
          <View style={[styles.box, { flex: 1 }]}>
            <Text style={styles.boxLabel}>Presupuesto estimado</Text>
            <Text style={styles.boxText}>{plan?.presupuestoEstimado != null ? `$${plan.presupuestoEstimado.toLocaleString("es-AR")}` : "No corresponde"}</Text>
          </View>
        </View>

        <View wrap={false} style={{ marginTop: 12 }}>
          <Text style={styles.h1Num}>02</Text>
          <Text style={styles.h1}>Resumen ejecutivo</Text>
          <View style={styles.h1Rule} />
          <Text style={styles.p}>{plan?.resumenEjecutivo ? t(plan.resumenEjecutivo) : "No disponible."}</Text>
        </View>

        <View wrap={false} style={{ marginTop: 12 }}>
          <Text style={styles.h1Num}>03</Text>
          <Text style={styles.h1}>Línea de tiempo anual</Text>
          <View style={styles.h1Rule} />
          <View style={styles.tableHeadRow}>
            <Text style={[styles.tableHeadText, styles.colMes]}>Mes</Text>
            <Text style={[styles.tableHeadText, styles.colLanzamiento]}>Lanzamiento</Text>
            <Text style={[styles.tableHeadText, styles.colAcciones]}>Acciones principales</Text>
          </View>
        </View>
        {sortedLaunches.map((l) => (
          <View key={l.id} style={styles.tableRow} wrap={false}>
            <Text style={[styles.cellText, styles.colMes]}>{monthName(l.fechaObjetivo)}</Text>
            <Text style={[styles.cellTextBold, styles.colLanzamiento]}>{t(l.titulo)}</Text>
            <Text style={[styles.cellText, styles.colAcciones]}>
              {actionsByLaunch(l.id).map((a) => actionLabel(a)).join(", ") || "Sin acciones cargadas"}
            </Text>
          </View>
        ))}
        {generalActions.length > 0 && (
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.cellText, styles.colMes]}>—</Text>
            <Text style={[styles.cellTextBold, styles.colLanzamiento]}>Acciones generales</Text>
            <Text style={[styles.cellText, styles.colAcciones]}>{generalActions.map((a) => actionLabel(a)).join(", ")}</Text>
          </View>
        )}

        <Footer artist={artistName} />
      </Page>

      <Page size="A4" style={styles.page}>
        <View wrap={false}>
          <Text style={styles.h1Num}>04</Text>
          <Text style={styles.h1}>Detalle de cada lanzamiento</Text>
          <View style={styles.h1Rule} />
        </View>
        {sortedLaunches.length === 0 && <Text style={styles.p}>Todavía no hay lanzamientos cargados en el cronograma.</Text>}
        {sortedLaunches.map((l) => (
          <View key={l.id} style={styles.launchCard} wrap={false}>
            <Text style={styles.launchTitle}>{t(l.titulo)}</Text>
            <Text style={styles.launchMeta}>{formatFecha(l.fechaObjetivo)}{l.objetivo ? ` · ${t(l.objetivo)}` : ""}</Text>
            {actionsByLaunch(l.id).map((a) => (
              <View key={a.id} style={styles.actionRow}>
                <Text style={styles.actionTitle}>{t(actionLabel(a))}</Text>
                {a.descripcion && <Text style={styles.cellText}>{t(a.descripcion)}</Text>}
                <View style={styles.actionMetaRow}>
                  <Text style={styles.actionMetaValue}><Text style={styles.actionMetaLabel}>Responsable: </Text>{a.responsable ? t(a.responsable) : "s/d"}</Text>
                  <Text style={styles.actionMetaValue}><Text style={styles.actionMetaLabel}>Fecha límite: </Text>{formatFecha(a.fechaLimite)}</Text>
                  <Text style={styles.actionMetaValue}><Text style={styles.actionMetaLabel}>Estado: </Text>{a.estado}</Text>
                </View>
              </View>
            ))}
            {actionsByLaunch(l.id).length === 0 && <Text style={styles.cellText}>Sin acciones cargadas todavía.</Text>}
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 16 }}>
          <Text style={styles.h1Num}>05</Text>
          <Text style={styles.h1}>Metas de crecimiento y resultados esperados</Text>
          <View style={styles.h1Rule} />
          <Text style={styles.p}>{plan?.metasYResultados ? t(plan.metasYResultados) : "No disponible."}</Text>
        </View>

        <Footer artist={artistName} />
      </Page>

      <Page size="A4" style={styles.page}>
        <View wrap={false}>
          <Text style={styles.h1Num}>06</Text>
          <Text style={styles.h1}>Revisiones trimestrales</Text>
          <View style={styles.h1Rule} />
        </View>
        <View style={styles.quarterGrid}>
          {["Q1", "Q2", "Q3", "Q4"].map((q) => {
            const review = quarterlyReviews.find((r) => r.quarter.endsWith(q));
            return (
              <View key={q} style={styles.quarterBox} wrap={false}>
                <Text style={styles.quarterTitle}>{q}{review?.fecha ? ` · ${formatFecha(review.fecha)}` : ""}</Text>
                <Text style={[styles.cellText, { marginBottom: 4 }]}><Text style={styles.actionMetaLabel}>PM: </Text>{review?.observacionesPm ? t(review.observacionesPm) : "Sin completar."}</Text>
                <Text style={styles.cellText}><Text style={styles.actionMetaLabel}>Management: </Text>{review?.observacionesManagement ? t(review.observacionesManagement) : "Sin completar."}</Text>
              </View>
            );
          })}
        </View>

        <View wrap={false} style={{ marginTop: 16 }}>
          <Text style={styles.h1Num}>07</Text>
          <Text style={styles.h1}>Observaciones y decisiones de la reunión</Text>
          <View style={styles.h1Rule} />
          <View style={styles.observacionesArea} />
        </View>

        <Footer artist={artistName} />
      </Page>
    </Document>
  );
}
