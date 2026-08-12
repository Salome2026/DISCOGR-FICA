import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { Screen } from "@/components/screen";
import { listPublishingSplits } from "@discografica/shared/api/editorialSplits";
import type { SplitCard } from "@discografica/shared/types/editorialSplits";

function formatDate(v: string): string {
  return v.slice(0, 10);
}

export default function SplitsPendientesScreen() {
  const [splits, setSplits] = useState<SplitCard[] | null>(null);

  useEffect(() => {
    listPublishingSplits("Pendiente").then((d) => setSplits(d.splits ?? [])).catch(() => setSplits([]));
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Splits pendientes" subtitle="Listos para revisar y enviar." onBack={() => router.back()} scroll={false}>
        {splits === null ? (
          <ActivityIndicator color={theme.accentColor} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={splits}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No hay splits pendientes por ahora.</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/publishing/splits/${item.id}`)} style={styles.card}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.trackName}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.artistDisplay} · {item.createdBy} · {formatDate(item.createdAt)}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Pendiente</Text>
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
  list: { paddingHorizontal: theme.space.xl, paddingBottom: theme.space["4xl"], gap: theme.space.sm },
  empty: { color: theme.text3, fontSize: 13, textAlign: "center", marginTop: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: theme.space.md, backgroundColor: theme.bg1, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusMd, padding: theme.space.md },
  cardTitle: { color: theme.text1, ...theme.type.bodyStrong },
  cardMeta: { color: theme.text3, ...theme.type.small, marginTop: 2 },
  badge: { backgroundColor: theme.warnBg, borderRadius: theme.radiusPill, paddingHorizontal: theme.space.sm, paddingVertical: 3, flexShrink: 0 },
  badgeText: { color: theme.warnInk, fontSize: 10.5, fontWeight: "700", textTransform: "uppercase" },
});
