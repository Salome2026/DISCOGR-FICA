import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listCatalogTracks, getRoyaltySplits, setRoyaltySplits } from "@discografica/shared/api/label";
import type { CatalogTrack, PartyType } from "@discografica/shared/types/label";

type Split = { partyType: PartyType; partyName: string; percentage: string };

function EstadisticasIngresosCard() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Estadísticas de ingresos</Text>
      <Text style={styles.placeholderText}>
        Este módulo se va a alimentar con los reportes de regalías. Todavía no hay ningún reporte
        cargado, así que no se muestra ningún número — nada acá está simulado ni estimado.
      </Text>
      <View style={styles.placeholderGrid}>
        {["Ingresos por sello", "Ingresos por artista", "Ingresos por fonograma", "Evolución mensual"].map((label) => (
          <View key={label} style={styles.placeholderBox}>
            <Text style={styles.placeholderBoxTitle}>{label}</Text>
            <Text style={styles.placeholderBoxSub}>Sin datos cargados.</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RegaliasNetasCard() {
  const [allTracks, setAllTracks] = useState<CatalogTrack[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogTrack | null>(null);
  const [splits, setSplits] = useState<Split[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  function ensureLoaded() {
    if (allTracks === null) {
      listCatalogTracks().then((d) => setAllTracks(d.tracks ?? [])).catch(() => setAllTracks([]));
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !allTracks) return [];
    return allTracks
      .filter((t) => t.track.toLowerCase().includes(q) || t.artist_display.toLowerCase().includes(q) || (t.album ?? "").toLowerCase().includes(q))
      .slice(0, 15);
  }, [allTracks, query]);

  function selectTrack(t: CatalogTrack) {
    setSelected(t);
    setQuery("");
    setSaveMsg(null);
    setSplits(null);
    getRoyaltySplits(t.id)
      .then((d) => setSplits((d.splits ?? []).map((s) => ({ partyType: s.party_type, partyName: s.party_name, percentage: String(s.percentage) }))))
      .catch(() => setSplits([]));
  }

  function addRow(partyType: PartyType) {
    setSplits((prev) => [...(prev ?? []), { partyType, partyName: "", percentage: "" }]);
  }
  function updateRow(i: number, patch: Partial<Split>) {
    setSplits((prev) => (prev ? prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) : prev));
  }
  function removeRow(i: number) {
    setSplits((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const total = (splits ?? []).reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

  async function save() {
    if (!selected || !splits) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await setRoyaltySplits(
        selected.id,
        splits.map((s) => ({ partyType: s.partyType, partyName: s.partyName, percentage: Number(s.percentage) }))
      );
      setSaveMsg("Guardado.");
    } catch {
      setSaveMsg("Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Cálculo de regalías netas</Text>
      <Text style={styles.placeholderText}>
        Buscá un fonograma para ver o cargar su reparto porcentual. Cada fonograma tiene su propio reparto.
      </Text>

      <TextInput
        value={query}
        onChangeText={(v) => { setQuery(v); ensureLoaded(); }}
        placeholder="Buscar fonograma por nombre, artista o álbum..."
        placeholderTextColor="#5a5d68"
        style={styles.input}
      />
      {results.length > 0 && (
        <View style={styles.results}>
          {results.map((t) => (
            <Pressable key={t.id} onPress={() => selectTrack(t)} style={styles.resultRow}>
              <Text style={styles.resultText}>
                <Text style={{ fontWeight: "700" }}>{t.track}</Text> — {t.artist_display.replace(/\|/g, ", ")}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {selected && (
        <View style={styles.selectedBlock}>
          <Text style={styles.selectedTitle}>{selected.track}</Text>
          <Text style={styles.selectedSub}>
            {selected.artist_display.replace(/\|/g, ", ")}{selected.sello ? ` · ${selected.sello}` : ""}
          </Text>

          {splits === null ? (
            <ActivityIndicator color="#3fc6d1" style={{ marginTop: 12 }} />
          ) : (
            <>
              {splits.length === 0 && <Text style={styles.placeholderText}>Sin reparto cargado todavía.</Text>}
              {splits.map((s, i) => (
                <View key={i} style={styles.splitRow}>
                  <Pressable
                    onPress={() => updateRow(i, { partyType: s.partyType === "sello" ? "artista" : "sello" })}
                    style={styles.splitTypeButton}
                  >
                    <Text style={styles.splitTypeText}>{s.partyType === "sello" ? "Sello" : "Artista"}</Text>
                  </Pressable>
                  <TextInput
                    value={s.partyName}
                    onChangeText={(v) => updateRow(i, { partyName: v })}
                    placeholder={s.partyType === "sello" ? "Nombre del sello" : "Nombre del artista"}
                    placeholderTextColor="#5a5d68"
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  />
                  <TextInput
                    value={s.percentage}
                    onChangeText={(v) => updateRow(i, { percentage: v })}
                    placeholder="%"
                    keyboardType="numeric"
                    placeholderTextColor="#5a5d68"
                    style={[styles.input, { width: 60, marginBottom: 0, textAlign: "center" }]}
                  />
                  <Pressable onPress={() => removeRow(i)}>
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              ))}

              <View style={styles.addRowButtons}>
                <Pressable onPress={() => addRow("sello")} style={styles.addSmallButton}>
                  <Text style={styles.addSmallText}>+ Sello</Text>
                </Pressable>
                <Pressable onPress={() => addRow("artista")} style={styles.addSmallButton}>
                  <Text style={styles.addSmallText}>+ Artista</Text>
                </Pressable>
              </View>

              <View style={styles.saveRow}>
                <Text style={[styles.totalText, total === 100 && { color: "#7fae6f" }]}>Total: {total}%</Text>
                <Pressable onPress={save} disabled={saving || splits.length === 0} style={styles.saveButton}>
                  {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>Guardar reparto</Text>}
                </Pressable>
              </View>
              {saveMsg && <Text style={styles.saveMsg}>{saveMsg}</Text>}
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function CatalogoScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Catálogo</Text>
        <Text style={styles.subtitle}>Ranking de artistas, estadísticas de ingresos y reparto de regalías</Text>
      </View>

      <EstadisticasIngresosCard />
      <RegaliasNetasCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  section: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16 },
  sectionLabel: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  placeholderText: { color: "#8b8e97", fontSize: 12.5, marginBottom: 12, lineHeight: 18 },
  placeholderGrid: { gap: 10 },
  placeholderBox: { backgroundColor: "#0c0c0e", borderWidth: 1, borderColor: "#2a2b30", borderStyle: "dashed", borderRadius: 10, padding: 14 },
  placeholderBoxTitle: { color: "#fff", fontSize: 12.5, fontWeight: "600", marginBottom: 4 },
  placeholderBoxSub: { color: "#5a5d68", fontSize: 11.5 },
  input: { backgroundColor: "#0c0c0e", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: "#fff", fontSize: 13, marginBottom: 8 },
  results: { borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, overflow: "hidden", marginBottom: 8 },
  resultRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#2a2b30" },
  resultText: { color: "#fff", fontSize: 12.5 },
  selectedBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#2a2b30" },
  selectedTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  selectedSub: { color: "#8b8e97", fontSize: 12, marginTop: 2, marginBottom: 12 },
  splitRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  splitTypeButton: { backgroundColor: "#0c0c0e", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  splitTypeText: { color: "#8b8e97", fontSize: 11.5, fontWeight: "600" },
  removeText: { color: "#5a5d68", fontSize: 16, paddingHorizontal: 4 },
  addRowButtons: { flexDirection: "row", gap: 8, marginBottom: 12 },
  addSmallButton: { borderWidth: 1, borderColor: "#2a2b30", borderStyle: "dashed", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addSmallText: { color: "#8b8e97", fontSize: 11.5 },
  saveRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalText: { color: "#8b8e97", fontSize: 12 },
  saveButton: { backgroundColor: "#3fc6d1", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9 },
  saveButtonText: { color: "#000", fontWeight: "700", fontSize: 12.5 },
  saveMsg: { color: "#d9a441", fontSize: 12, marginTop: 8 },
});
