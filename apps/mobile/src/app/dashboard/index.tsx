import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listAcuerdos, listCatalogTracks } from "@discografica/shared/api/label";
import type { Acuerdo, CatalogTrack } from "@discografica/shared/types/label";
import { SELLOS, assignSello } from "@discografica/shared/sellos";
import { DonutChart } from "@/components/donut-chart";
import { DrillDownModal, type DrillDownField } from "@/components/drill-down-modal";
import { ReleaseCalendar } from "@/components/release-calendar";
import { RankingListeners } from "@/components/ranking-listeners";

const COLORS = ["#3fc6d1", "#eef0f4", "#9a9da8", "#71737d", "#4d4f57", "#2f3036"];

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

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

type ArtistDrillRow = { artist: string; trackCount: number; companies: string[]; sello: string; acuerdosVinculados: number };

const ACUERDO_FIELDS: DrillDownField<Acuerdo>[] = [
  { label: "Artista / acuerdo", render: (r) => r.nombre },
  { label: "Distribuidora", render: (r) => r.compania ?? "" },
  { label: "Estado", render: (r) => r.estado.join(", ") },
  { label: "Responsable", render: (r) => r.responsable ?? "" },
  { label: "Audio", render: (r) => (r.audio ? "✓" : "✗") },
  { label: "Portada", render: (r) => (r.portada ? "✓" : "✗") },
];

const TRACK_FIELDS: DrillDownField<CatalogTrack>[] = [
  { label: "Artista", render: (r) => r.artist_display.replace(/\|/g, ", ") },
  { label: "Fonograma", render: (r) => r.track },
  { label: "Álbum", render: (r) => r.album ?? "" },
  { label: "ISRC", render: (r) => r.isrc ?? "" },
  { label: "Fecha", render: (r) => r.release_date ?? "" },
];

const ARTIST_FIELDS: DrillDownField<ArtistDrillRow>[] = [
  { label: "Artista", render: (r) => r.artist },
  { label: "Fonogramas", render: (r) => String(r.trackCount) },
  { label: "Distribuidora", render: (r) => r.companies.join(", ") },
  { label: "Sello", render: (r) => r.sello },
  { label: "Acuerdos vinculados", render: (r) => String(r.acuerdosVinculados) },
];

type Drill =
  | { kind: "acuerdos"; title: string; subtitle: string; rows: Acuerdo[] }
  | { kind: "tracks"; title: string; subtitle: string; rows: CatalogTrack[] }
  | { kind: "artists"; title: string; subtitle: string; rows: ArtistDrillRow[] }
  | null;

function KpiCard({ label, value, sub, accent, onPress }: { label: string; value: string; sub: string; accent?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.kpi, accent && styles.kpiAccent]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, accent && styles.kpiValueAccent]}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </Pressable>
  );
}

export default function LabelDashboardScreen() {
  const [acuerdos, setAcuerdos] = useState<Acuerdo[] | null>(null);
  const [catalogTracks, setCatalogTracks] = useState<CatalogTrack[] | null>(null);
  const [drill, setDrill] = useState<Drill>(null);

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

  const artistaAcuerdoCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of acuerdos ?? []) {
      const key = norm(a.nombre);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [acuerdos]);

  const artistRows = useMemo<ArtistDrillRow[]>(() => {
    if (!catalogTracks) return [];
    const map = new Map<string, ArtistDrillRow>();
    for (const t of catalogTracks) {
      const names = t.artist_display.split("|").map((s) => s.trim()).filter((n) => n && n.toLowerCase() !== "la juntada de los artistas");
      for (const name of names) {
        if (!map.has(name)) map.set(name, { artist: name, trackCount: 0, companies: [], sello: assignSello(name) ?? "Sin asignar", acuerdosVinculados: artistaAcuerdoCount.get(norm(name)) ?? 0 });
        const entry = map.get(name)!;
        entry.trackCount += 1;
        if (t.company && !entry.companies.includes(t.company)) entry.companies.push(t.company);
      }
    }
    return [...map.values()].sort((a, b) => a.artist.localeCompare(b.artist, "es"));
  }, [catalogTracks, artistaAcuerdoCount]);

  const companyBuckets = useMemo(() => {
    if (!catalogTracks) return [] as { company: string; tracks: CatalogTrack[] }[];
    const buckets = new Map<string, CatalogTrack[]>();
    for (const t of catalogTracks) {
      const company = t.company || "Sin distribuidora";
      if (!buckets.has(company)) buckets.set(company, []);
      buckets.get(company)!.push(t);
    }
    return [...buckets.entries()].map(([company, tracks]) => ({ company, tracks })).sort((a, b) => b.tracks.length - a.tracks.length);
  }, [catalogTracks]);

  const donutTotal = catalogTracks?.length ?? 0;
  const donutSegments = useMemo(() => {
    const top = companyBuckets.slice(0, 6);
    const rest = companyBuckets.slice(6);
    const segs = top.map((c, i) => ({ label: c.company, count: c.tracks.length, color: COLORS[i % COLORS.length] }));
    if (rest.length > 0) {
      const restCount = rest.reduce((sum, c) => sum + c.tracks.length, 0);
      segs.push({ label: "Otras", count: restCount, color: "#1c1d22" });
    }
    return segs;
  }, [companyBuckets]);

  function openEstado(estado: string) {
    if (!acuerdos) return;
    setDrill({ kind: "acuerdos", title: estado, subtitle: "Estado de acuerdo", rows: acuerdos.filter((a) => estadoBucket(a.estado) === estado) });
  }

  function openCompany(label: string) {
    if (label === "Otras") {
      const rest = companyBuckets.slice(6).flatMap((c) => c.tracks);
      setDrill({ kind: "tracks", title: "Otras distribuidoras", subtitle: `${rest.length} canciones`, rows: rest });
      return;
    }
    const bucket = companyBuckets.find((c) => c.company === label);
    if (bucket) setDrill({ kind: "tracks", title: bucket.company, subtitle: `${bucket.tracks.length} canciones`, rows: bucket.tracks });
  }

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

      <View style={styles.navRow}>
        <Pressable onPress={() => router.push("/catalogo" as never)} style={styles.navPill}>
          <Text style={styles.navPillText}>Catálogo</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/nuevo" as never)} style={styles.navPill}>
          <Text style={styles.navPillText}>+ Nuevo acuerdo</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/pm" as never)} style={styles.navPill}>
          <Text style={styles.navPillText}>Project Managers</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/admin/usuarios" as never)} style={styles.navPill}>
          <Text style={styles.navPillText}>Usuarios</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/admin/artistas" as never)} style={styles.navPill}>
          <Text style={styles.navPillText}>Artistas</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/playlists" as never)} style={styles.navPill}>
          <Text style={styles.navPillText}>Playlists</Text>
        </Pressable>
      </View>

      <View style={styles.selloRow}>
        {SELLOS.filter((s) => s !== "Streamings").map((s) => (
          <Pressable key={s} onPress={() => router.push(`/sellos/${encodeURIComponent(s)}` as never)} style={styles.selloButton}>
            <Text style={styles.selloButtonText} numberOfLines={2}>{s}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push("/catalogo-distribuido" as never)} style={styles.selloButton}>
          <Text style={styles.selloButtonText}>Catálogo Distribuido</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/streamings" as never)} style={styles.selloButton}>
          <Text style={styles.selloButtonText}>Streamings</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard label="Firmados" value={String(firmados.length)} sub={`de ${acuerdos?.length ?? "—"} acuerdos`} accent
              onPress={() => setDrill({ kind: "acuerdos", title: "Firmados", subtitle: "Acuerdos firmados", rows: firmados })} />
            <KpiCard label="Artistas en catálogo" value={String(artistRows.length)} sub="con fonogramas cargados"
              onPress={() => setDrill({ kind: "artists", title: "Artistas en catálogo", subtitle: `${artistRows.length} artistas`, rows: artistRows })} />
            <KpiCard label="Sin audio" value={String(sinAudio.length)} sub="acuerdos"
              onPress={() => setDrill({ kind: "acuerdos", title: "Sin audio", subtitle: "Acuerdos sin audio cargado", rows: sinAudio })} />
            <KpiCard label="Sin portada" value={String(sinPortada.length)} sub="acuerdos"
              onPress={() => setDrill({ kind: "acuerdos", title: "Sin portada", subtitle: "Acuerdos sin portada cargada", rows: sinPortada })} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Distribuidoras (por canción)</Text>
            <DonutChart segments={donutSegments} total={donutTotal} onSelect={openCompany} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Calendario de lanzamientos</Text>
            <ReleaseCalendar />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Oyentes mensuales</Text>
            <RankingListeners />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Estado de acuerdos</Text>
            {estadoCounts.map(([estado, count]) => (
              <Pressable key={estado} onPress={() => openEstado(estado)} style={styles.estadoRow}>
                <View style={[styles.estadoDot, { backgroundColor: ESTADO_COLORS[estado] ?? "#8b8e97" }]} />
                <Text style={styles.estadoName}>{estado}</Text>
                <Text style={styles.estadoCount}>{count}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {drill && drill.kind === "acuerdos" && (
        <DrillDownModal title={drill.title} subtitle={drill.subtitle} rows={drill.rows} fields={ACUERDO_FIELDS} keyExtractor={(r) => r.id} onClose={() => setDrill(null)} />
      )}
      {drill && drill.kind === "tracks" && (
        <DrillDownModal title={drill.title} subtitle={drill.subtitle} rows={drill.rows} fields={TRACK_FIELDS} keyExtractor={(r) => r.id} onClose={() => setDrill(null)} />
      )}
      {drill && drill.kind === "artists" && (
        <DrillDownModal title={drill.title} subtitle={drill.subtitle} rows={drill.rows} fields={ARTIST_FIELDS} keyExtractor={(r) => r.artist} onClose={() => setDrill(null)} />
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
  navRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 6, marginBottom: 10 },
  navPill: { backgroundColor: "#0c0c0e", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
  navPillText: { color: "#8b8e97", fontSize: 11, fontWeight: "600" },
  selloRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  selloButton: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minWidth: "30%", flexGrow: 1, alignItems: "center", justifyContent: "center" },
  selloButtonText: { color: "#fff", fontSize: 11, fontWeight: "600", textAlign: "center" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 12, marginBottom: 14 },
  kpi: { flexBasis: "47%", flexGrow: 1, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 14, padding: 16, gap: 4 },
  kpiAccent: { borderColor: "#3fc6d1" },
  kpiLabel: { color: "#8b8e97", fontSize: 11.5 },
  kpiValue: { color: "#fff", fontSize: 28, fontWeight: "700", marginTop: 4 },
  kpiValueAccent: { color: "#3fc6d1" },
  kpiSub: { color: "#5a5d68", fontSize: 11 },
  section: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16, gap: 4 },
  sectionLabel: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  estadoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  estadoDot: { width: 8, height: 8, borderRadius: 4 },
  estadoName: { color: "#fff", fontSize: 13, flex: 1 },
  estadoCount: { color: "#8b8e97", fontSize: 13, fontWeight: "700" },
});
