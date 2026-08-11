import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { listPmReleases } from "@discografica/shared/api/pm";
import type { PmRelease } from "@discografica/shared/types/pm";

const ESTADO_COLORS: Record<string, string> = {
  Firmado: "#3fc6d1",
  Contactado: "#8b93e8",
  "Necesito ayuda": "#e5484d",
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function PmDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tracks, setTracks] = useState<PmRelease[] | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    listPmReleases()
      .then((d) => {
        const all = d.releases ?? [];
        const target = all.find((r) => String(r.id) === id);
        if (!target) {
          setTracks(null);
          return;
        }
        const group = target.group_id != null ? all.filter((r) => r.group_id === target.group_id) : [target];
        setTracks(group.sort((a, b) => (a.track_number ?? 0) - (b.track_number ?? 0)));
      })
      .catch(() => setTracks(null));
  }, [id]);

  if (tracks === undefined) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 60 }} />
      </View>
    );
  }
  if (tracks === null || tracks.length === 0) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.empty}>Lanzamiento no encontrado.</Text>
      </View>
    );
  }

  const first = tracks[0];
  const titulo = first.group_nombre || first.fonograma_nombre;
  const color = ESTADO_COLORS[first.estado] ?? "#8b8e97";
  const portadaUrl = tracks.find((t) => t.portada_url)?.portada_url ?? null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        {portadaUrl ? <Image source={{ uri: portadaUrl }} style={styles.cover} /> : null}
        <Text style={styles.title}>{titulo}</Text>
        <Text style={styles.subtitle}>{first.artist_name}</Text>
        <View style={[styles.badge, { backgroundColor: `${color}29` }]}>
          <Text style={[styles.badgeText, { color }]}>{first.estado}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Información general</Text>
        <Row label="Sello" value={first.sello} />
        <Row label="Distribuidora" value={first.distribuidora} />
        <Row label="Fecha de lanzamiento" value={first.fecha_lanzamiento?.slice(0, 10)} />
        <Row label="Hora" value={first.hora_lanzamiento} />
        <Row label="Proyecto de streaming" value={first.streaming_project} />
        <Row label="Cargado por" value={first.created_by} />
      </View>

      {tracks.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Canciones ({tracks.length})</Text>
          {tracks.map((t) => (
            <View key={t.id} style={styles.trackRow}>
              <Text style={styles.trackNumber}>{t.track_number ?? "—"}</Text>
              <Text style={styles.trackName} numberOfLines={1}>{t.fonograma_nombre}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fonograma</Text>
          <Row label="Título" value={first.fonograma_nombre} />
          <Row label="Autores / compositores" value={first.autores_compositores} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, alignItems: "flex-start" },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  cover: { width: 96, height: 96, borderRadius: 14, marginBottom: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#8b8e97", fontSize: 13, marginTop: 2 },
  badge: { marginTop: 8, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 40 },
  section: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16, gap: 7 },
  sectionLabel: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: "#8b8e97", fontSize: 13 },
  rowValue: { color: "#fff", fontSize: 13, textAlign: "right", flexShrink: 1 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  trackNumber: { color: "#5a5d68", fontSize: 12, width: 18 },
  trackName: { color: "#fff", fontSize: 13, flex: 1 },
});
