import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Image, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listManagementArtists } from "@discografica/shared/api/management";
import type { ManagementArtistRow } from "@discografica/shared/types/management";

export default function ManagementRosterScreen() {
  const [artists, setArtists] = useState<ManagementArtistRow[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listManagementArtists().then((d) => setArtists(d.artists ?? [])).catch(() => setArtists([]));
  }, []);

  const filtered = (artists ?? []).filter((a) => a.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Roster</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar artista..."
          placeholderTextColor="#5a5d68"
          style={styles.searchInput}
        />
      </View>

      {artists === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin resultados.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, item.nextRelease && styles.cardUpcoming]}>
              {item.chartPosition != null && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>#{item.chartPosition}</Text>
                </View>
              )}
              <View style={styles.avatar}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>{item.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>{item.sello ?? "Sin sello"}</Text>
                <Text style={styles.cardListeners}>
                  {item.monthlyListeners != null ? `${item.monthlyListeners.toLocaleString("es-AR")} oyentes/mes` : "Sin datos de oyentes"}
                </Text>
              </View>
              {item.estadoGeneral ? (
                <View style={styles.estadoBadge}>
                  <Text style={styles.estadoBadgeText}>{item.estadoGeneral}</Text>
                </View>
              ) : null}
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
  cardUpcoming: { borderColor: "#e5484d", backgroundColor: "rgba(229,72,77,0.08)" },
  rankBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#20222a", borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  rankBadgeText: { color: "#8b8e97", fontSize: 10, fontWeight: "700" },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#20222a", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 44, height: 44 },
  avatarLetter: { color: "#8b8e97", fontSize: 16, fontWeight: "700" },
  cardName: { color: "#fff", fontSize: 14.5, fontWeight: "600" },
  cardMeta: { color: "#8b8e97", fontSize: 12, marginTop: 1 },
  cardListeners: { color: "#5a5d68", fontSize: 11.5, marginTop: 2 },
  estadoBadge: { backgroundColor: "#20222a", borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  estadoBadgeText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
});
