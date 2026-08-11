import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listStreamingProjects, createStreamingProject, updateStreamingProject, listCatalogTracks } from "@discografica/shared/api/label";
import type { StreamingProjectRow } from "@discografica/shared/types/label";

export default function StreamingsIndexScreen() {
  const [projects, setProjects] = useState<StreamingProjectRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    listStreamingProjects(true).then((d) => setProjects(d.projects ?? [])).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    loadProjects();
    listCatalogTracks({ sello: "Streamings" }).then((d) => {
      const c: Record<string, number> = {};
      for (const t of d.tracks ?? []) {
        if (!t.streaming_project) continue;
        c[t.streaming_project] = (c[t.streaming_project] ?? 0) + 1;
      }
      setCounts(c);
    }).catch(() => {});
  }, [loadProjects]);

  async function addProject() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createStreamingProject(newName.trim());
      setNewName("");
      loadProjects();
    } catch {
      setError("No se pudo crear el proyecto (¿ya existe?).");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: StreamingProjectRow) {
    await updateStreamingProject(p.id, { active: !p.active }).catch(() => {});
    loadProjects();
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Streamings</Text>
        <Text style={styles.subtitle}>Proyectos de streaming de VPO — cada uno con su propio catálogo</Text>
      </View>

      {projects === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.list}>
          {projects.map((p) => (
            <View key={p.id} style={[styles.card, !p.active && styles.cardInactive]}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/streamings/${encodeURIComponent(p.name)}` as never)}>
                <Text style={styles.cardName}>{p.name}</Text>
                <Text style={styles.cardSub}>
                  {counts ? `${counts[p.name] ?? 0} fonogramas` : "Cargando..."}
                  {!p.active ? " · inactivo" : ""}
                </Text>
              </Pressable>
              <Pressable onPress={() => toggleActive(p)} style={styles.toggleButton}>
                <Text style={styles.toggleText}>{p.active ? "Desactivar" : "Reactivar"}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Agregar proyecto de streaming</Text>
        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nombre del nuevo proyecto"
            placeholderTextColor="#5a5d68"
            style={styles.input}
          />
          <Pressable onPress={addProject} disabled={saving} style={styles.addButton}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.addButtonText}>+ Agregar</Text>}
          </Pressable>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
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
  list: { paddingHorizontal: 20, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14 },
  cardInactive: { opacity: 0.5 },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cardSub: { color: "#8b8e97", fontSize: 12, marginTop: 3 },
  toggleButton: { borderWidth: 1, borderColor: "#2a2b30", borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { color: "#8b8e97", fontSize: 10.5, fontWeight: "600" },
  section: { marginHorizontal: 20, marginTop: 16, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16 },
  sectionLabel: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  addRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: "#0c0c0e", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontSize: 13 },
  addButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: "#000", fontWeight: "700", fontSize: 13 },
  error: { color: "#e5484d", fontSize: 12, marginTop: 8 },
});
