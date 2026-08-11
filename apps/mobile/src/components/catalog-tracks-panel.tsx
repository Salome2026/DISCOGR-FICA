import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { listCatalogTracks } from "@discografica/shared/api/label";
import type { CatalogTrack } from "@discografica/shared/types/label";
import { DonutChart } from "./donut-chart";

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

// Mirrors app/components/CatalogTracksPanel.tsx — same live catalog_tracks
// data source, parameterized by query (sello/unassigned/project) same as web.
export function CatalogTracksPanel({
  sello,
  unassigned,
  project,
  emptyMessage,
}: {
  sello?: string;
  unassigned?: boolean;
  project?: string;
  emptyMessage: string;
}) {
  const [tracks, setTracks] = useState<CatalogTrack[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listCatalogTracks({ sello, unassigned, project }).then((d) => setTracks(d.tracks ?? [])).catch(() => setTracks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sello, unassigned, project]);

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

  if (tracks === null) {
    return <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />;
  }
  if (tracks.length === 0) {
    return <Text style={styles.empty}>{emptyMessage}</Text>;
  }

  return (
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
  );
}

const styles = StyleSheet.create({
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
