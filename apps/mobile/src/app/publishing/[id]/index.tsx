import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { getPublishingArtist } from "@discografica/shared/api/publishing";
import type { PublishingArtist } from "@discografica/shared/types/publishing";
import { openDocument } from "@/lib/pdf-viewer";

const FIELDS: { key: keyof PublishingArtist; label: string }[] = [
  { key: "nombreCompleto", label: "Nombre completo" },
  { key: "apellido", label: "Apellido" },
  { key: "dni", label: "DNI" },
  { key: "cuil", label: "CUIL" },
  { key: "sadaic", label: "N° de SADAIC / IPI" },
  { key: "direccion", label: "Dirección" },
  { key: "localidad", label: "Localidad" },
  { key: "provincia", label: "Provincia" },
  { key: "nacionalidad", label: "Nacionalidad" },
  { key: "fechaNacimiento", label: "Fecha de nacimiento" },
  { key: "email", label: "Correo electrónico" },
  { key: "telefono", label: "Teléfono" },
  { key: "sello", label: "Sello" },
];

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

export default function PublishingArtistFichaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [artist, setArtist] = useState<PublishingArtist | null | undefined>(undefined);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPublishingArtist(id).then((d) => setArtist(d.artist ?? null));
  }, [id]);

  async function handleOpenDoc() {
    if (!artist?.documentoUrl) return;
    setOpening(true);
    try {
      await openDocument(`/api/publishing/file?url=${encodeURIComponent(artist.documentoUrl)}`);
    } catch {
      Alert.alert("Error", "No se pudo abrir el documento.");
    } finally {
      setOpening(false);
    }
  }

  if (artist === undefined) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 60 }} />
      </View>
    );
  }
  if (artist === null) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.empty}>Artista no encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>{artist.nombreArtistico}</Text>
        <View style={[styles.tag, artist.tipo === "Propio" ? styles.tagPropio : styles.tagExterno]}>
          <Text style={[styles.tagText, artist.tipo === "Propio" ? styles.tagTextPropio : styles.tagTextExterno]}>{artist.tipo}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.grid}>
          {FIELDS.map(({ key, label }) => (
            <Field key={key} label={label} value={artist[key] as string | null} />
          ))}
        </View>
      </View>

      {artist.observaciones ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Observaciones</Text>
          <Text style={styles.freeText}>{artist.observaciones}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Documentación adjunta</Text>
        {artist.documentoUrl ? (
          <Pressable onPress={handleOpenDoc} disabled={opening} style={styles.docButton}>
            {opening ? <ActivityIndicator color="#000" /> : <Text style={styles.docButtonText}>{artist.documentoNombre ?? "Ver documento"}</Text>}
          </Pressable>
        ) : (
          <Text style={styles.freeTextMuted}>Sin documentación cargada.</Text>
        )}
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
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 40 },
  tag: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  tagPropio: { backgroundColor: "rgba(63,198,209,0.16)" },
  tagExterno: { backgroundColor: "#20222a" },
  tagText: { fontSize: 10.5, fontWeight: "700" },
  tagTextPropio: { color: "#3fc6d1" },
  tagTextExterno: { color: "#8b8e97" },
  section: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16 },
  sectionLabel: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  field: { minWidth: "45%" },
  fieldLabel: { color: "#5a5d68", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldValue: { color: "#fff", fontSize: 13.5, marginTop: 2 },
  freeText: { color: "#fff", fontSize: 13, lineHeight: 19 },
  freeTextMuted: { color: "#5a5d68", fontSize: 13 },
  docButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  docButtonText: { color: "#000", fontWeight: "700", fontSize: 13.5 },
});
