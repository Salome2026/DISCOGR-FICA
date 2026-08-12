import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { router, Stack } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { listHojas } from "@discografica/shared/api/tourManager";
import type { HojaDeRuta } from "@discografica/shared/types/tourManager";
import { Screen } from "@/components/screen";
import { useResponsive } from "@/lib/responsive";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

export default function TourManagerListScreen() {
  const [hojas, setHojas] = useState<HojaDeRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const { isTablet } = useResponsive();

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
      <Screen
        title="Tour Manager"
        subtitle="Hojas de ruta de cada show"
        onBack={() => router.back()}
        scroll={false}
        headerRight={
          <Pressable onPress={() => router.push("/tourmanager/new")} style={styles.newButton}>
            <Text style={styles.newButtonText}>+ Nueva</Text>
          </Pressable>
        }
      >
        <View style={styles.toolbar}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por artista o venue..."
            placeholderTextColor={theme.text3}
            style={styles.searchInput}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accentColor} style={{ marginTop: theme.space["2xl"] }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(h) => h.id}
            numColumns={isTablet ? 2 : 1}
            key={isTablet ? "2col" : "1col"}
            columnWrapperStyle={isTablet ? { gap: theme.space.md } : undefined}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.accentColor} />}
            ListEmptyComponent={
              <Text style={styles.empty}>{hojas.length === 0 ? "Todavía no hay hojas de ruta cargadas." : "Sin resultados para esa búsqueda."}</Text>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/tourmanager/${item.id}`)} style={[styles.card, isTablet && { flex: 1 }]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardArtist} numberOfLines={1}>{item.artistName}</Text>
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
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg0 },
  newButton: { backgroundColor: theme.accentColor, borderRadius: theme.radiusSm, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm },
  newButtonText: { color: "#000", ...theme.type.smallStrong },
  toolbar: { paddingHorizontal: theme.space.xl, marginBottom: theme.space.md },
  searchInput: {
    backgroundColor: theme.bg2,
    borderWidth: 1,
    borderColor: theme.lineSoft,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    color: theme.text1,
    ...theme.type.body,
  },
  list: { paddingHorizontal: theme.space.xl, paddingBottom: theme.space["3xl"], gap: theme.space.md },
  empty: { color: theme.text3, ...theme.type.small, textAlign: "center", marginTop: theme.space["2xl"] },
  card: { backgroundColor: theme.bg1, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusMd, padding: theme.space.lg, gap: theme.space.xs },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: theme.space.sm },
  cardArtist: { color: theme.text1, ...theme.type.h3, flexShrink: 1 },
  cardMeta: { color: theme.text2, ...theme.type.small },
  cardVenue: { color: theme.text3, ...theme.type.caption },
  badge: { paddingHorizontal: theme.space.sm, paddingVertical: 3, borderRadius: theme.radiusPill, backgroundColor: theme.bg2 },
  badgeConfirmado: { backgroundColor: "rgba(63,198,209,0.16)" },
  badgeText: { color: theme.text2, ...theme.type.caption, fontWeight: "700" },
  badgeTextConfirmado: { color: theme.accentColor },
});
