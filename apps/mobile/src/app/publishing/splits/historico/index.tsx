import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { Screen } from "@/components/screen";
import { listPublishingSplits } from "@discografica/shared/api/editorialSplits";
import type { SplitCard } from "@discografica/shared/types/editorialSplits";

function formatDate(v: string): string {
  return v.slice(0, 10);
}

export default function SplitsHistoricoScreen() {
  const [q, setQ] = useState("");
  const [splits, setSplits] = useState<SplitCard[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      listPublishingSplits("Enviado", q.trim() || undefined)
        .then((d) => setSplits(d.splits ?? []))
        .catch(() => setSplits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Histórico de splits" onBack={() => router.back()} scroll={false}>
        <View style={styles.toolbar}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por canción o artista..."
            placeholderTextColor={theme.text3}
            style={styles.searchInput}
          />
        </View>

        {splits === null ? (
          <ActivityIndicator color={theme.accentColor} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={splits}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{q ? "No encontramos ningún split con esa búsqueda." : "Todavía no hay splits enviados."}</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/publishing/splits/${item.id}`)} style={styles.card}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.trackName}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.artistDisplay} · {item.createdBy} · {item.sentAt ? `Enviado ${formatDate(item.sentAt)}` : ""}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Enviado</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: theme.space.xl, marginBottom: theme.space.md },
  searchInput: { backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 1, color: theme.text1, fontSize: 13.5 },
  list: { paddingHorizontal: theme.space.xl, paddingBottom: theme.space["4xl"], gap: theme.space.sm },
  empty: { color: theme.text3, fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: theme.space.md, backgroundColor: theme.bg1, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusMd, padding: theme.space.md },
  cardTitle: { color: theme.text1, ...theme.type.bodyStrong },
  cardMeta: { color: theme.text3, ...theme.type.small, marginTop: 2 },
  badge: { backgroundColor: theme.goodBg, borderRadius: theme.radiusPill, paddingHorizontal: theme.space.sm, paddingVertical: 3, flexShrink: 0 },
  badgeText: { color: theme.goodInk, fontSize: 10.5, fontWeight: "700", textTransform: "uppercase" },
});
