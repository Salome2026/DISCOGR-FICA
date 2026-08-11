import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { listHojas } from "@discografica/shared/api/tourManager";
import type { HojaDeRuta } from "@discografica/shared/types/tourManager";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default function TourManagerListScreen() {
  const [hojas, setHojas] = useState<HojaDeRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await listHojas();
      setHojas(data.hojas ?? []);
    } catch {
      // silencioso — la pantalla se queda con la última lista cargada
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = hojas.filter((h) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return h.artistName.toLowerCase().includes(q) || (h.venue ?? "").toLowerCase().includes(q);
  });

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Tour Manager</Text>
        <Text style={styles.subtitle}>Hojas de ruta de cada show</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por artista o venue..."
          placeholderTextColor="#5a5d68"
          style={styles.searchInput}
        />
        <Pressable onPress={() => router.push("/tourmanager/new")} style={styles.newButton}>
          <Text style={styles.newButtonText}>+ Nueva</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3fc6d1" />}
          ListEmptyComponent={
            <Text style={styles.empty}>{hojas.length === 0 ? "Todavía no hay hojas de ruta cargadas." : "Sin resultados para esa búsqueda."}</Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/tourmanager/${item.id}`)} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardArtist}>{item.artistName}</Text>
                <View style={[styles.badge, item.estado === "Confirmado" && styles.badgeConfirmado]}>
                  <Text style={[styles.badgeText, item.estado === "Confirmado" && styles.badgeTextConfirmado]}>{item.estado}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                {formatFecha(item.fecha)}
                {item.horaShow ? ` · ${item.horaShow}` : ""}
                {item.tipoEvento ? ` · ${item.tipoEvento}` : ""}
              </Text>
              {item.venue ? <Text style={styles.cardVenue}>{item.venue}</Text> : null}
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
  cardVenue: { color: "#5a5d68", fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: "#20222a" },
  badgeConfirmado: { backgroundColor: "rgba(63,198,209,0.16)" },
  badgeText: { color: "#8b8e97", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  badgeTextConfirmado: { color: "#3fc6d1" },
});
