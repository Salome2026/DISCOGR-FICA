import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { listCatalogTracks } from "@discografica/shared/api/label";
import type { CatalogTrack } from "@discografica/shared/types/label";
import { DonutChart } from "@/components/donut-chart";

const COMPANY_ORDER = ["ADA", "FUGA", "ONErpm", "DashGo", "The Orchard", "SoundOn", "Sin distribuidora"];
const COMPANY_COLOR: Record<string, string> = {
  ADA: "#3fc6d1",
  FUGA: "#eef0f4",
  ONErpm: "#9a9da8",
  DashGo: "#71737d",
  "The Orchard": "#4d4f57",
  SoundOn: "#c3c6cf",
  "Sin distribuidora": "#2f3036",
};

// Live catalog_tracks view, filtered by sello — same data source as the web's
// CatalogTracksPanel (not the frozen data/tracks.json snapshot RosterSelloView
// still uses; the dashboard already moved off that same frozen file for the
// same reason, see app/dashboard/page.tsx's liveArtistRows comment). The
// Rizzvor/Kids "Proyectos" pre-production pipeline (checklists, comments,
// audio player, convert-to-lanzamiento) is its own large module and stays
// web-only for now.
export default function SelloDetailScreen() {
  const { nombre } = useLocalSearchParams<{ nombre: string }>();
  const selloName = decodeURIComponent(nombre ?? "");
  const [tracks, setTracks] = useState<CatalogTrack[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selloName) return;
    listCatalogTracks({ sello: selloName }).then((d) => setTracks(d.tracks ?? [])).catch(() => setTracks([]));
  }, [selloName]);

  const breakdown = useMemo(() => {
    if (!tracks) return [];
    const counts = new Map<string, number>();
    for (const t of tracks) {
      const c = t.company || "Sin distribuidora";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return COMPANY_ORDER.filter((c) => counts.has(c)).map((c) => ({ label: c, count: counts.get(c)!, color: COMPANY_COLOR[c] ?? "#8a7c62" }));
  }, [tracks]);

  const q = search.trim().toLowerCase();
  const visible = (tracks ?? []).filter((t) => !q || t.track.toLowerCase().includes(q) || t.artist_display.toLowerCase().includes(q));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>{selloName}</Text>
        <Text style={styles.subtitle}>{tracks ? `${tracks.length} fonogramas` : "Cargando..."}</Text>
      </View>

      {tracks === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : tracks.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay fonogramas asignados a {selloName}.</Text>
      ) : (
        <>
          {breakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Distribución por discográfica</Text>
              <DonutChart segments={breakdown} total={tracks.length} />
            </View>
          )}

          <View style={styles.toolbar}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por canción o artista..."
              placeholderTextColor="#5a5d68"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.list}>
            {visible.map((t) => (
              <View key={t.id} style={styles.trackRow}>
                <Text style={styles.trackName} numberOfLines={1}>{t.track}</Text>
                <Text style={styles.trackMeta} numberOfLines={1}>
                  {t.artist_display.replace(/\|/g, ", ")}{t.company ? ` · ${t.company}` : ""}{t.release_date ? ` · ${t.release_date}` : ""}
                </Text>
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
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24, paddingHorizontal: 20 },
  section: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16 },
  sectionLabel: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  toolbar: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 13.5 },
  list: { paddingHorizontal: 20, gap: 8 },
  trackRow: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, padding: 12 },
  trackName: { color: "#fff", fontSize: 13.5, fontWeight: "600" },
  trackMeta: { color: "#8b8e97", fontSize: 11.5, marginTop: 3 },
});
