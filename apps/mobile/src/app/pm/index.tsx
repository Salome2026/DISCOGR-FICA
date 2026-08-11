import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Image, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listPmReleases } from "@discografica/shared/api/pm";
import type { PmRelease } from "@discografica/shared/types/pm";

type Group = {
  key: string;
  ids: number[];
  titulo: string;
  artista: string;
  sello: string | null;
  estado: string;
  fecha: string | null;
  portadaUrl: string | null;
  marketingPlan: boolean;
};

const ESTADO_COLORS: Record<string, string> = {
  Firmado: "#3fc6d1",
  Contactado: "#8b93e8",
  "Necesito ayuda": "#e5484d",
};

export default function PmListScreen() {
  const [releases, setReleases] = useState<PmRelease[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listPmReleases().then((d) => setReleases(d.releases ?? [])).catch(() => setReleases([]));
  }, []);

  const groups = useMemo<Group[]>(() => {
    if (!releases) return [];
    const byKey = new Map<string, PmRelease[]>();
    for (const r of releases) {
      const k = r.group_id != null ? `g${r.group_id}` : `r${r.id}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(r);
    }
    const out: Group[] = [];
    for (const [key, group] of byKey) {
      const first = group[0];
      out.push({
        key,
        ids: group.map((g) => g.id),
        titulo: first.group_nombre || first.fonograma_nombre,
        artista: first.artist_name,
        sello: first.sello,
        estado: first.estado,
        fecha: first.fecha_lanzamiento,
        portadaUrl: group.find((g) => g.portada_url)?.portada_url ?? null,
        marketingPlan: false,
      });
    }
    return out.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  }, [releases]);

  const q = search.trim().toLowerCase();
  const visible = groups.filter((g) => !q || g.titulo.toLowerCase().includes(q) || g.artista.toLowerCase().includes(q));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>PM</Text>
        <Text style={styles.subtitle}>Lanzamientos</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por artista o título..."
          placeholderTextColor="#5a5d68"
          style={styles.searchInput}
        />
      </View>

      {releases === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(g) => g.key}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin lanzamientos.</Text>}
          renderItem={({ item }) => {
            const color = ESTADO_COLORS[item.estado] ?? "#8b8e97";
            return (
              <Pressable onPress={() => router.push(`/pm/${item.ids[0]}`)} style={styles.card}>
                {item.portadaUrl ? (
                  <Image source={{ uri: item.portadaUrl }} style={styles.cover} />
                ) : (
                  <View style={styles.coverDot} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.titulo}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.artista} · {item.sello ?? "Sin sello"}{item.fecha ? ` · ${item.fecha.slice(0, 10)}` : ""}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${color}29` }]}>
                  <Text style={[styles.badgeText, { color }]}>{item.estado}</Text>
                </View>
              </Pressable>
            );
          }}
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
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 2 },
  toolbar: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: {
    backgroundColor: "#15161a",
    borderWidth: 1,
    borderColor: "#2a2b30",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 13.5,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 12 },
  cover: { width: 44, height: 44, borderRadius: 10 },
  coverDot: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#20222a" },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardMeta: { color: "#8b8e97", fontSize: 11.5, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontSize: 10.5, fontWeight: "700" },
});
