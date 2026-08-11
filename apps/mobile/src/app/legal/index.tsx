import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, Image, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listContracts, listLegalArtists } from "@discografica/shared/api/legal";
import type { LegalContract, LegalArtist } from "@discografica/shared/types/legal";

// Case/accent/whitespace-insensitive — same criteria as the web grid
// (app/panel/legal/contratos/page.tsx), so a contract saved with slightly
// different spelling still matches its roster artist.
function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

export default function LegalArtistGridScreen() {
  const [artists, setArtists] = useState<LegalArtist[] | null>(null);
  const [contracts, setContracts] = useState<LegalContract[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listLegalArtists().then((d) => setArtists(d.artists ?? [])).catch(() => setArtists([]));
    listContracts().then((d) => setContracts(d.contracts ?? [])).catch(() => setContracts([]));
  }, []);

  // Contratos de artistas "Potencial" que todavía no tienen fila en el
  // roster oficial siguen necesitando una tarjeta para acceder a ellos.
  const allArtists = useMemo(() => {
    const base = artists ?? [];
    if (!contracts) return base;
    const known = new Set(base.map((a) => normalizeName(a.name)));
    const orphans = new Map<string, LegalArtist>();
    for (const c of contracts) {
      const key = normalizeName(c.artist);
      if (known.has(key) || orphans.has(key)) continue;
      orphans.set(key, { id: `orphan-${key}`, name: c.artist, sello: null, photoUrl: null });
    }
    return [...base, ...orphans.values()];
  }, [artists, contracts]);

  const contractCountByArtist = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contracts ?? []) {
      const key = normalizeName(c.artist);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [contracts]);

  const visible = allArtists.filter((a) => a.name.toLowerCase().includes(search.trim().toLowerCase()));
  const loading = artists === null || contracts === null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Panel de Legales</Text>
        <Text style={styles.subtitle}>Contratos de Artistas</Text>
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

      {loading ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(a) => a.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Sin resultados.</Text>}
          renderItem={({ item }) => {
            const count = contractCountByArtist.get(normalizeName(item.name)) ?? 0;
            return (
              <Pressable onPress={() => router.push(`/legal/${encodeURIComponent(item.name)}`)} style={styles.card}>
                <View style={styles.avatar}>
                  {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.avatarImg} /> : <Text style={styles.avatarLetter}>{item.name.charAt(0).toUpperCase()}</Text>}
                </View>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>{item.sello ?? "Sin sello"}</Text>
                <Text style={styles.cardCount}>{count > 0 ? `${count} contrato${count > 1 ? "s" : ""}` : "Sin contratos"}</Text>
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
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { flex: 1, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14, alignItems: "center", gap: 4 },
  avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#20222a", alignItems: "center", justifyContent: "center", marginBottom: 4, overflow: "hidden" },
  avatarImg: { width: 48, height: 48 },
  avatarLetter: { color: "#8b8e97", fontSize: 18, fontWeight: "700" },
  cardName: { color: "#fff", fontSize: 13.5, fontWeight: "600", textAlign: "center" },
  cardMeta: { color: "#5a5d68", fontSize: 11, textAlign: "center" },
  cardCount: { color: "#8b8e97", fontSize: 11, textAlign: "center", marginTop: 2 },
});
