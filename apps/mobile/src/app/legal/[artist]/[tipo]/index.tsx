import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { listContracts } from "@discografica/shared/api/legal";
import type { LegalContract } from "@discografica/shared/types/legal";
import { openDocument } from "@/lib/pdf-viewer";

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

function MiniField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.miniField}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

export default function LegalCategoryScreen() {
  const { artist: artistParam, tipo: tipoParam } = useLocalSearchParams<{ artist: string; tipo: string }>();
  const artist = decodeURIComponent(artistParam ?? "");
  const tipo = decodeURIComponent(tipoParam ?? "");
  const [contracts, setContracts] = useState<LegalContract[] | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    listContracts().then((d) => setContracts(d.contracts ?? [])).catch(() => setContracts([]));
  }, []);

  const list = (contracts ?? [])
    .filter((c) => normalizeName(c.artist) === normalizeName(artist) && c.tipoContrato === tipo)
    .sort((a, b) => (b.fechaFirma ?? "").localeCompare(a.fechaFirma ?? ""));

  async function handleOpen(c: LegalContract) {
    if (!c.documentoUrl) return;
    setOpeningId(c.id);
    try {
      await openDocument(`/api/legal/file?url=${encodeURIComponent(c.documentoUrl)}`);
    } catch {
      Alert.alert("Error", "No se pudo abrir el documento.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{tipo}</Text>
        <Text style={styles.title}>{artist}</Text>
      </View>

      {contracts === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : list.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay un contrato de {tipo.toLowerCase()} cargado para este artista.</Text>
      ) : (
        <View style={styles.list}>
          {list.map((c) => {
            const color = ESTADO_COLORS[c.estado] ?? "#8b8e97";
            return (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.badge, { backgroundColor: `${color}29` }]}>
                    <Text style={[styles.badgeText, { color }]}>{c.estado}</Text>
                  </View>
                  {c.estado === "Vigente" && isVencido(c.fechaVencimiento) ? <Text style={styles.warn}>⚠ venció</Text> : null}
                </View>

                <View style={styles.grid}>
                  <MiniField label="Fecha de firma" value={c.fechaFirma} />
                  <MiniField label="Vencimiento" value={c.fechaVencimiento} />
                  <MiniField label="Contraparte" value={c.contraparte} />
                  <MiniField label="Código interno" value={c.codigoInterno} />
                  <MiniField label="Canción / proyecto" value={c.fonograma} />
                  <MiniField label="Firmantes" value={c.firmantes} />
                </View>

                {c.docusignEnvelopeId ? <Text style={styles.docusignTag}>Importado desde DocuSign</Text> : null}
                {c.notas ? <Text style={styles.notas}>{c.notas}</Text> : null}

                {c.documentoUrl ? (
                  <Pressable onPress={() => handleOpen(c)} disabled={openingId === c.id} style={styles.docButton}>
                    {openingId === c.id ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.docButtonText}>Ver documento</Text>
                    )}
                  </Pressable>
                ) : (
                  <Text style={styles.noDoc}>Sin documento cargado</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  eyebrow: { color: "#3fc6d1", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 2 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24, paddingHorizontal: 20 },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  warn: { color: "#e5484d", fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  miniField: { minWidth: "45%" },
  miniLabel: { color: "#5a5d68", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.5 },
  miniValue: { color: "#fff", fontSize: 12.5, marginTop: 1 },
  docusignTag: { color: "#3fc6d1", fontSize: 10.5 },
  notas: { color: "#8b8e97", fontSize: 12 },
  docButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  docButtonText: { color: "#000", fontWeight: "700", fontSize: 13.5 },
  noDoc: { color: "#5a5d68", fontSize: 12 },
});
