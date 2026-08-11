import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listManagementReleases } from "@discografica/shared/api/management";
import type { ManagementReleaseRow } from "@discografica/shared/types/management";

type ReleaseGroup = {
  key: string;
  titulo: string;
  artista: string;
  sello: string | null;
  distribuidora: string | null;
  estado: string;
  fecha: string;
  hora: string;
  portadaUrl: string | null;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default function ManagementReleasesScreen() {
  const [rows, setRows] = useState<ManagementReleaseRow[] | null>(null);

  useEffect(() => {
    listManagementReleases().then((d) => setRows(d.releases ?? [])).catch(() => setRows([]));
  }, []);

  const groups = useMemo<ReleaseGroup[]>(() => {
    if (!rows) return [];
    const today = todayKey();
    const byKey = new Map<string, ManagementReleaseRow[]>();
    for (const r of rows) {
      if (!r.fecha_lanzamiento) continue;
      if (String(r.fecha_lanzamiento).slice(0, 10) < today) continue;
      const k = r.group_id != null ? `g${r.group_id}` : `r${r.id}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(r);
    }
    const out: ReleaseGroup[] = [];
    for (const [key, group] of byKey) {
      const first = group[0];
      out.push({
        key,
        titulo: first.group_nombre || first.fonograma_nombre,
        artista: first.artist_name,
        sello: first.sello,
        distribuidora: first.distribuidora,
        estado: first.estado,
        fecha: String(first.fecha_lanzamiento).slice(0, 10),
        hora: first.hora_lanzamiento || "00:00",
        portadaUrl: group.find((g) => g.portada_url)?.portada_url ?? null,
      });
    }
    return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [rows]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Próximos lanzamientos</Text>
      </View>

      {rows === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.key}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No hay lanzamientos próximos.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.portadaUrl ? (
                <Image source={{ uri: item.portadaUrl }} style={styles.cover} />
              ) : (
                <View style={styles.coverDot} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.titulo}</Text>
                <Text style={styles.cardMeta} numberOfLines={2}>
                  {item.artista} · {item.sello ?? "Sin sello"} · {formatFecha(item.fecha)} · {item.hora} hs
                  {item.distribuidora ? ` · ${item.distribuidora}` : ""}
                </Text>
              </View>
              <View style={styles.estadoBadge}>
                <Text style={styles.estadoBadgeText}>{item.estado}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 12 },
  cover: { width: 44, height: 44, borderRadius: 10 },
  coverDot: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#20222a" },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardMeta: { color: "#8b8e97", fontSize: 11.5, marginTop: 2, lineHeight: 15 },
  estadoBadge: { backgroundColor: "#20222a", borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  estadoBadgeText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
});
