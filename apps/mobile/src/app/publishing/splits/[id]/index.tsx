import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { Screen } from "@/components/screen";
import { getPublishingSplit, markSplitSent } from "@discografica/shared/api/editorialSplits";
import type { EditorialSplit, SplitPerson } from "@discografica/shared/types/editorialSplits";

function formatX100(x100: number): string {
  return (x100 / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

function formatDateTime(v: string): string {
  return new Date(v).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function PersonList({ title, people }: { title: string; people: SplitPerson[] }) {
  const total = people.reduce((s, p) => s + p.percentX100, 0);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {people.map((p) => (
        <View key={p.personId} style={styles.personRow}>
          <Text style={styles.personName}>{p.personName}</Text>
          <Text style={styles.personPercent}>{formatX100(p.percentX100)}%</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalValue}>{formatX100(total)}%</Text>
      </View>
    </View>
  );
}

export default function SplitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [split, setSplit] = useState<EditorialSplit | null | undefined>(undefined);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!id) return;
    getPublishingSplit(id).then((d) => setSplit(d.split ?? null));
  }
  useEffect(load, [id]);

  async function handleMarkSent() {
    if (!id) return;
    setMarking(true);
    setError(null);
    try {
      const d = await markSplitSent(id);
      setSplit(d.split);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar como enviado.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Detalle del split" onBack={() => router.back()}>
        {split === undefined ? (
          <ActivityIndicator color={theme.accentColor} style={{ marginTop: 24 }} />
        ) : split === null ? (
          <Text style={styles.empty}>No encontramos ese split.</Text>
        ) : (
          <View style={styles.wrap}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackTitle}>{split.trackName}</Text>
                <Text style={styles.trackMeta}>
                  {split.artistDisplay}
                  {split.sello ? ` · ${split.sello}` : ""}
                </Text>
              </View>
              <View style={[styles.badge, split.estado === "Pendiente" ? styles.badgePendiente : styles.badgeEnviado]}>
                <Text style={[styles.badgeText, split.estado === "Pendiente" ? styles.badgeTextPendiente : styles.badgeTextEnviado]}>{split.estado}</Text>
              </View>
            </View>

            <Text style={styles.meta}>
              Cargado por {split.createdBy} · {formatDateTime(split.createdAt)}
              {split.estado === "Enviado" && split.sentAt ? `\nEnviado por ${split.sentBy} · ${formatDateTime(split.sentAt)}` : ""}
            </Text>

            <PersonList title="LETRA" people={split.letra} />
            <PersonList title="MÚSICA" people={split.musica} />

            {error && <Text style={styles.error}>{error}</Text>}

            {split.estado === "Pendiente" && (
              <Pressable style={[styles.submitButton, marking && styles.submitButtonDisabled]} disabled={marking} onPress={handleMarkSent}>
                {marking ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>✓ Marcar como enviado</Text>}
              </Pressable>
            )}
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: theme.space.xl, paddingBottom: theme.space["4xl"] },
  empty: { color: theme.text3, fontSize: 13, textAlign: "center", marginTop: 24, paddingHorizontal: theme.space.xl },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: theme.space.md },
  trackTitle: { color: theme.text1, ...theme.type.h2 },
  trackMeta: { color: theme.text3, ...theme.type.small, marginTop: 2 },
  badge: { borderRadius: theme.radiusPill, paddingHorizontal: theme.space.sm, paddingVertical: 3, flexShrink: 0 },
  badgePendiente: { backgroundColor: theme.warnBg },
  badgeEnviado: { backgroundColor: theme.goodBg },
  badgeText: { fontSize: 10.5, fontWeight: "700", textTransform: "uppercase" },
  badgeTextPendiente: { color: theme.warnInk },
  badgeTextEnviado: { color: theme.goodInk },
  meta: { color: theme.text3, ...theme.type.small, marginTop: theme.space.md, lineHeight: 18 },
  section: { marginTop: theme.space.xl },
  sectionTitle: { color: theme.text1, ...theme.type.h3, marginBottom: theme.space.sm },
  personRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: theme.space.xs + 2, borderBottomWidth: 1, borderBottomColor: theme.lineSoft },
  personName: { color: theme.text1, fontSize: 13.5 },
  personPercent: { color: theme.text1, fontSize: 13.5 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: theme.space.sm },
  totalLabel: { color: theme.goodInk, fontSize: 13.5, fontWeight: "700" },
  totalValue: { color: theme.goodInk, fontSize: 13.5, fontWeight: "700" },
  error: { color: theme.critInk, fontSize: 12.5, marginTop: theme.space.md },
  submitButton: { marginTop: theme.space.xl, backgroundColor: theme.accentColor, borderRadius: theme.radiusSm, paddingVertical: theme.space.md, alignItems: "center" },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#000", fontWeight: "700", fontSize: 14 },
});
