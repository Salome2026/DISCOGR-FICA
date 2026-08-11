import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { listContracts } from "@discografica/shared/api/legal";
import { TIPOS_CONTRATO } from "@discografica/shared/types/legal";
import type { LegalContract } from "@discografica/shared/types/legal";

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function isVencido(fechaVencimiento: string | null): boolean {
  if (!fechaVencimiento) return false;
  return new Date(fechaVencimiento) < new Date(new Date().toDateString());
}

const ESTADO_COLORS: Record<string, string> = {
  Vigente: "#3fc6d1",
  Vencido: "#e5484d",
  Pendiente: "#d9a441",
  Rescindido: "#5a5d68",
  Finalizado: "#5a5d68",
  Potencial: "#8b93e8",
};

export default function LegalArtistFichaScreen() {
  const { artist: artistParam } = useLocalSearchParams<{ artist: string }>();
  const artist = decodeURIComponent(artistParam ?? "");
  const [contracts, setContracts] = useState<LegalContract[] | null>(null);

  useEffect(() => {
    listContracts().then((d) => setContracts(d.contracts ?? [])).catch(() => setContracts([]));
  }, []);

  const forArtist = (contracts ?? []).filter((c) => normalizeName(c.artist) === normalizeName(artist));

  function currentFor(tipo: string): LegalContract | undefined {
    return forArtist
      .filter((c) => c.tipoContrato === tipo)
      .sort((a, b) => (b.fechaFirma ?? "").localeCompare(a.fechaFirma ?? ""))[0];
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>{artist}</Text>
        <Text style={styles.subtitle}>Contratos por categoría</Text>
      </View>

      {contracts === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.list}>
          {TIPOS_CONTRATO.map((tipo) => {
            const current = currentFor(tipo);
            const color = current ? ESTADO_COLORS[current.estado] ?? "#8b8e97" : "#5a5d68";
            return (
              <Pressable
                key={tipo}
                onPress={() => router.push(`/legal/${encodeURIComponent(artist)}/${encodeURIComponent(tipo)}`)}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{tipo}</Text>
                {current ? (
                  <View style={styles.cardRow}>
                    <View style={[styles.badge, { backgroundColor: `${color}29` }]}>
                      <Text style={[styles.badgeText, { color }]}>{current.estado}</Text>
                    </View>
                    {current.estado === "Vigente" && isVencido(current.fechaVencimiento) ? (
                      <Text style={styles.warn}>⚠ venció</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.cardEmpty}>Sin contrato cargado</Text>
                )}
              </Pressable>
            );
          })}
        </View>
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
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 2 },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16, gap: 8 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  warn: { color: "#e5484d", fontSize: 12, fontWeight: "600" },
  cardEmpty: { color: "#5a5d68", fontSize: 13 },
});
