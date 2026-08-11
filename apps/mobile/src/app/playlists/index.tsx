import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable, FlatList, Linking, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listPlaylists } from "@discografica/shared/api/playlists";
import type { Playlist } from "@discografica/shared/types/playlists";

// Connecting the label's Spotify account is a one-time OAuth redirect tied
// to a browser session/cookie — that setup step stays on the web
// (vpocorp.com/panel/playlists). This screen only views playlists once
// the account is already connected.
export default function PlaylistsScreen() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPlaylists()
      .then((d) => {
        setConfigured(d.configured);
        setPlaylists(d.playlists ?? []);
      })
      .catch(() => setConfigured(false))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Playlists de Spotify</Text>
        <Text style={styles.subtitle}>
          {configured ? `${playlists.length} playlist${playlists.length === 1 ? "" : "s"} conectada${playlists.length === 1 ? "" : "s"}` : "Sin conectar todavía"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : configured === false ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Todavía no conectamos la cuenta de Spotify del sello</Text>
          <Text style={styles.emptyText}>
            La conexión es un paso único que se hace desde la web (vpocorp.com/panel/playlists), porque pasa por
            el navegador de Spotify. Una vez conectada, las playlists van a aparecer acá.
          </Text>
        </View>
      ) : playlists.length === 0 ? (
        <Text style={styles.emptyText}>La cuenta está conectada pero todavía no tiene playlists.</Text>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => item.spotifyUrl && Linking.openURL(item.spotifyUrl)}
              style={styles.card}
            >
              {item.coverImageUrl ? (
                <Image source={{ uri: item.coverImageUrl }} style={styles.cover} />
              ) : (
                <View style={styles.coverEmpty}>
                  <Text style={styles.coverEmptyText}>Sin portada</Text>
                </View>
              )}
              <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.trackCount ?? 0} temas · {item.followerCount != null ? `${item.followerCount} seguidores` : "seguidores: —"}
              </Text>
              {item.genre ? (
                <View style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{item.genre}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 4 },
  emptyState: { marginHorizontal: 20, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 14, padding: 24, alignItems: "center", gap: 10 },
  emptyTitle: { color: "#fff", fontSize: 14.5, fontWeight: "700", textAlign: "center" },
  emptyText: { color: "#8b8e97", fontSize: 12.5, textAlign: "center", lineHeight: 18, paddingHorizontal: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { flex: 1, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 10, gap: 6 },
  cover: { width: "100%", aspectRatio: 1, borderRadius: 8 },
  coverEmpty: { width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor: "#0c0c0e", alignItems: "center", justifyContent: "center" },
  coverEmptyText: { color: "#5a5d68", fontSize: 11 },
  cardName: { color: "#fff", fontSize: 12.5, fontWeight: "600", lineHeight: 16 },
  cardMeta: { color: "#5a5d68", fontSize: 10.5 },
  genreTag: { alignSelf: "flex-start", backgroundColor: "rgba(63,198,209,0.16)", borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  genreTagText: { color: "#3fc6d1", fontSize: 9.5, fontWeight: "600" },
});
