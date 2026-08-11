import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { listShows, syncSheet } from "@discografica/shared/api/booking";
import type { BookingShow } from "@discografica/shared/types/booking";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

const ESTADO_COLORS: Record<string, string> = {
  Confirmado: "#3fc6d1",
  Pendiente: "#8b8e97",
  Cerrado: "#5a5d68",
};

export default function BookingListScreen() {
  const [shows, setShows] = useState<BookingShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (withSync: boolean) => {
    try {
      if (withSync) await syncSheet().catch(() => {});
      const data = await listShows();
      const sorted = [...(data.shows ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
      setShows(sorted);
    } catch {
      // silencioso — la pantalla se queda con la última lista cargada
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const filtered = shows.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.artistName.toLowerCase().includes(q) || (s.venue ?? "").toLowerCase().includes(q) || (s.ciudad ?? "").toLowerCase().includes(q);
  });

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Booking</Text>
        <Text style={styles.subtitle}>Agenda de shows</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por artista, venue o ciudad..."
          placeholderTextColor="#5a5d68"
          style={styles.searchInput}
        />
        <Pressable onPress={() => router.push("/booking/new")} style={styles.newButton}>
          <Text style={styles.newButtonText}>+ Nuevo</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#3fc6d1" />}
          ListEmptyComponent={
            <Text style={styles.empty}>{shows.length === 0 ? "Todavía no hay shows cargados." : "Sin resultados para esa búsqueda."}</Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/booking/${item.id}`)} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardArtist}>{item.artistName}</Text>
                <View style={[styles.badge, { backgroundColor: `${ESTADO_COLORS[item.estado] ?? "#8b8e97"}29` }]}>
                  <Text style={[styles.badgeText, { color: ESTADO_COLORS[item.estado] ?? "#8b8e97" }]}>{item.estado}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                {formatFecha(item.fecha)}
                {item.hora ? ` · ${item.hora}` : ""}
                {item.ciudad ? ` · ${item.ciudad}` : item.venue ? ` · ${item.venue}` : ""}
              </Text>
            </Pressable>
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
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 2 },
  toolbar: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  searchInput: {
    flex: 1,
    backgroundColor: "#15161a",
    borderWidth: 1,
    borderColor: "#2a2b30",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 13.5,
  },
  newButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  newButtonText: { color: "#000", fontWeight: "700", fontSize: 13.5 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14, gap: 5 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardArtist: { color: "#fff", fontSize: 15.5, fontWeight: "600", flexShrink: 1 },
  cardMeta: { color: "#8b8e97", fontSize: 12.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
});
