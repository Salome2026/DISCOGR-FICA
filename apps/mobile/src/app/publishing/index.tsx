import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listPublishingArtists } from "@discografica/shared/api/publishing";
import type { PublishingArtist } from "@discografica/shared/types/publishing";

export default function PublishingArtistGridScreen() {
  const [artists, setArtists] = useState<PublishingArtist[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listPublishingArtists().then((d) => setArtists(d.artists ?? [])).catch(() => setArtists([]));
  }, []);

  const q = search.trim().toLowerCase();
  const visible = (artists ?? []).filter((a) => {
    if (!q) return true;
    return a.nombreArtistico.toLowerCase().includes(q) || (a.nombreCompleto ?? "").toLowerCase().includes(q) || (a.apellido ?? "").toLowerCase().includes(q);
  });

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Publishing</Text>
        <Text style={styles.subtitle}>Datos de Artistas</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre artístico o real..."
          placeholderTextColor="#5a5d68"
          style={styles.searchInput}
        />
      </View>

      {artists === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(a) => a.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin resultados.</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/publishing/${item.id}`)} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{item.nombreArtistico.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.cardName} numberOfLines={1}>{item.nombreArtistico}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{item.sello ?? "Sin sello"}</Text>
              <View style={[styles.tag, item.tipo === "Propio" ? styles.tagPropio : styles.tagExterno]}>
                <Text style={[styles.tagText, item.tipo === "Propio" ? styles.tagTextPropio : styles.tagTextExterno]}>{item.tipo}</Text>
              </View>
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
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { flex: 1, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14, alignItems: "center", gap: 4 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#20222a", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarLetter: { color: "#8b8e97", fontSize: 16, fontWeight: "700" },
  cardName: { color: "#fff", fontSize: 13.5, fontWeight: "600", textAlign: "center" },
  cardMeta: { color: "#5a5d68", fontSize: 11, textAlign: "center" },
  tag: { marginTop: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  tagPropio: { backgroundColor: "rgba(63,198,209,0.16)" },
  tagExterno: { backgroundColor: "#20222a" },
  tagText: { fontSize: 10, fontWeight: "700" },
  tagTextPropio: { color: "#3fc6d1" },
  tagTextExterno: { color: "#8b8e97" },
});
