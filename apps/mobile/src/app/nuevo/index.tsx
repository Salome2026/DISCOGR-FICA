import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { createAcuerdo } from "@discografica/shared/api/label";

const PRIORIDADES = ["Baja", "Media", "Alta"];

export default function NuevoAcuerdoScreen() {
  const [nombre, setNombre] = useState("");
  const [compania, setCompania] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!nombre.trim()) {
      setError("El nombre del acuerdo es obligatorio.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createAcuerdo({ nombre: nombre.trim(), compania, prioridad, comentario });
      router.back();
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹ Atrás</Text>
      </Pressable>
      <Text style={styles.title}>Nuevo acuerdo</Text>

      <View style={styles.panel}>
        <Text style={styles.label}>Nombre del acuerdo *</Text>
        <TextInput value={nombre} onChangeText={setNombre} placeholder="Ej: Artista X" placeholderTextColor="#5a5d68" style={styles.input} />

        <Text style={styles.label}>Compañía</Text>
        <TextInput value={compania} onChangeText={setCompania} placeholder="ADA / FUGA / ELLOS" placeholderTextColor="#5a5d68" style={styles.input} />

        <Text style={styles.label}>Prioridad</Text>
        <View style={styles.chipRow}>
          {PRIORIDADES.map((p) => (
            <Pressable key={p} onPress={() => setPrioridad(p)} style={[styles.chip, prioridad === p && styles.chipActive]}>
              <Text style={[styles.chipText, prioridad === p && styles.chipTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Comentario</Text>
        <TextInput value={comentario} onChangeText={setComentario} multiline numberOfLines={3} placeholderTextColor="#5a5d68" style={[styles.input, styles.textarea]} />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={handleSubmit} disabled={loading} style={styles.submitButton}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Guardar en Notion</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 20, paddingBottom: 48 },
  backButton: { alignSelf: "flex-start", marginBottom: 12 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 16 },
  panel: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 14, padding: 20 },
  label: { color: "#8b8e97", fontSize: 12.5, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#0c0c0e", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 14 },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#2a2b30", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#0c0c0e" },
  chipActive: { backgroundColor: "#3fc6d1", borderColor: "#3fc6d1" },
  chipText: { color: "#8b8e97", fontSize: 13 },
  chipTextActive: { color: "#000", fontWeight: "700" },
  error: { color: "#e5484d", fontSize: 12.5, marginTop: 12 },
  submitButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 20 },
  submitText: { color: "#000", fontWeight: "700", fontSize: 14 },
});
