import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listAcuerdos, listCatalogTracks } from "@discografica/shared/api/label";
import type { Acuerdo, CatalogTrack } from "@discografica/shared/types/label";

const ESTADO_COLORS: Record<string, string> = {
  Firmado: "#7fae6f",
  Contactado: "#8aa0c9",
  "NO SACAR": "#c96a5a",
  "Sin estado": "#8a7c62",
  Aprobado: "#dcdde2",
  "En negociación": "#d99a4e",
  Enviado: "#a894c9",
  "Sin Empezar": "#6b6152",
};

function estadoBucket(estado: string[]): string {
  if (!estado || estado.length === 0) return "Sin estado";
  if (estado.includes("Firmado")) return "Firmado";
  if (estado.includes("NO SACAR")) return "NO SACAR";
  if (estado.includes("Aprobado")) return "Aprobado";
  if (estado.includes("Sin Empezar")) return "Sin Empezar";
  if (estado.includes("Enviado Whatsapp") || estado.includes("Enviado Draft por Correo") || estado.includes("Enviado a la firma")) return "Enviado";
  if (estado.includes("En negociacion")) return "En negociación";
  if (estado.includes("Contactado")) return "Contactado";
  return "Sin estado";
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <View style={[styles.kpi, accent && styles.kpiAccent]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, accent && styles.kpiValueAccent]}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </View>
  );
}

export default function LabelDashboardScreen() {
  const [acuerdos, setAcuerdos] = useState<Acuerdo[] | null>(null);
  const [catalogTracks, setCatalogTracks] = useState<CatalogTrack[] | null>(null);

  useEffect(() => {
    listAcuerdos().then((d) => setAcuerdos(d.acuerdos ?? [])).catch(() => setAcuerdos([]));
    listCatalogTracks().then((d) => setCatalogTracks(d.tracks ?? [])).catch(() => setCatalogTracks([]));
  }, []);

  const firmados = acuerdos?.filter((a) => a.estado.includes("Firmado")) ?? [];
  const sinAudio = acuerdos?.filter((a) => !a.audio) ?? [];
  const sinPortada = acuerdos?.filter((a) => !a.portada) ?? [];

  const estadoCounts = useMemo(() => {
    if (!acuerdos) return [] as [string, number][];
    const buckets: Record<string, number> = {};
    for (const a of acuerdos) {
      const b = estadoBucket(a.estado);
      buckets[b] = (buckets[b] || 0) + 1;
    }
    return Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  }, [acuerdos]);

  const artistCount = useMemo(() => {
    if (!catalogTracks) return null;
    const set = new Set<string>();
    for (const t of catalogTracks) {
      for (const name of t.artist_display.split("|").map((s) => s.trim())) {
        if (name && name.toLowerCase() !== "la juntada de los artistas") set.add(name);
      }
    }
    return set.size;
  }, [catalogTracks]);

  const topCompanies = useMemo(() => {
    if (!catalogTracks) return [] as [string, number][];
    const buckets: Record<string, number> = {};
    for (const t of catalogTracks) {
      const company = t.company || "Sin distribuidora";
      buckets[company] = (buckets[company] || 0) + 1;
    }
    return Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [catalogTracks]);

  const loading = acuerdos === null || catalogTracks === null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Label</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard label="Firmados" value={String(firmados.length)} sub={`de ${acuerdos?.length ?? "—"} acuerdos`} accent />
            <KpiCard label="Artistas en catálogo" value={artistCount != null ? String(artistCount) : "—"} sub="con fonogramas cargados" />
            <KpiCard label="Sin audio" value={String(sinAudio.length)} sub="acuerdos" />
            <KpiCard label="Sin portada" value={String(sinPortada.length)} sub="acuerdos" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Estado de acuerdos</Text>
            {estadoCounts.map(([estado, count]) => (
              <View key={estado} style={styles.estadoRow}>
                <View style={[styles.estadoDot, { backgroundColor: ESTADO_COLORS[estado] ?? "#8b8e97" }]} />
                <Text style={styles.estadoName}>{estado}</Text>
                <Text style={styles.estadoCount}>{count}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Top distribuidoras (por canción)</Text>
            {topCompanies.map(([company, count]) => (
              <View key={company} style={styles.estadoRow}>
                <Text style={styles.estadoName} numberOfLines={1}>{company}</Text>
                <Text style={styles.estadoCount}>{count}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 2 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 12, marginBottom: 14 },
  kpi: { flexBasis: "47%", flexGrow: 1, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 14, padding: 16, gap: 4 },
  kpiAccent: { borderColor: "#3fc6d1" },
  kpiLabel: { color: "#8b8e97", fontSize: 11.5 },
  kpiValue: { color: "#fff", fontSize: 28, fontWeight: "700", marginTop: 4 },
  kpiValueAccent: { color: "#3fc6d1" },
  kpiSub: { color: "#5a5d68", fontSize: 11 },
  section: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16, gap: 4 },
  sectionLabel: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  estadoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  estadoDot: { width: 8, height: 8, borderRadius: 4 },
  estadoName: { color: "#fff", fontSize: 13, flex: 1 },
  estadoCount: { color: "#8b8e97", fontSize: 13, fontWeight: "700" },
});
