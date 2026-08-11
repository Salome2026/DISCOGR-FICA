import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { getHoja, deleteHoja } from "@discografica/shared/api/tourManager";
import type { HojaDeRuta } from "@discografica/shared/types/tourManager";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function HojaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hoja, setHoja] = useState<HojaDeRuta | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);

  function load() {
    if (!id) return;
    getHoja(id).then((d) => setHoja(d.hoja ?? null));
  }
  useEffect(load, [id]);

  function confirmDelete() {
    Alert.alert("Borrar hoja de ruta", "¿Seguro que querés borrar esta hoja de ruta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteHoja(id);
            router.replace("/tourmanager");
          } catch {
            Alert.alert("Error", "No se pudo borrar la hoja de ruta.");
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (hoja === undefined) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 60 }} />
      </View>
    );
  }
  if (hoja === null) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.empty}>Hoja de ruta no encontrada.</Text>
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
        <Text style={styles.title}>{hoja.artistName}</Text>
        <Text style={styles.subtitle}>Itinerario y Hospitality</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => router.push(`/tourmanager/${hoja.id}/edit`)} style={styles.editButton}>
          <Text style={styles.editText}>Editar</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleting} style={styles.deleteButton}>
          <Text style={styles.deleteText}>{deleting ? "Borrando..." : "Borrar"}</Text>
        </Pressable>
      </View>

      <View style={styles.sections}>
        <Section title="Información general">
          <Row label="Artista" value={hoja.artistName} />
          <Row label="Evento" value={hoja.tipoEvento} />
          <Row label="Fecha" value={formatFecha(hoja.fecha)} />
          <Row label="Horario del show" value={hoja.horaShow} />
          <Row label="Ciudad" value={hoja.venueCiudad} />
          <Row label="País" value={hoja.venuePais} />
        </Section>

        <Section title="Venue">
          <Row label="Nombre" value={hoja.venue} />
          <Row label="Dirección" value={hoja.venueFullAddress ?? hoja.venueDireccion} />
          <Row label="Contacto" value={hoja.venueContactoNombre} />
          <Row label="Teléfono" value={hoja.venueContactoTelefono} />
          <Row label="Duración del show" value={hoja.duracionShowMin ? `${hoja.duracionShowMin} min` : null} />
        </Section>

        <Section title="Cronograma de traslados">
          <Row label="Salida" value={hoja.horaSalida ? `${hoja.horaSalida} (${hoja.origenLabel ?? hoja.origenDireccion ?? "origen"})` : null} />
          <Row label="Llegada al venue" value={hoja.horaLlegadaVenue} />
          <Row label="Presentación" value={hoja.horaShow} />
          <Row label="Salida del venue" value={hoja.horaSalidaVenue} />
          <Row label="Llegada a destino" value={hoja.horaLlegadaDestino} />
        </Section>

        <Section title="Traslados detallados">
          <Row label="Pax" value={hoja.pax != null ? String(hoja.pax) : null} />
          <Row label="Driver" value={hoja.driverNombre} />
          <Row label="Tel. driver" value={hoja.driverTelefono} />
        </Section>

        <Section title="Contactos">
          <Row label="Contacto artista" value={hoja.contactoArtistaNombre} />
          <Row label="Tel. artista" value={hoja.contactoArtistaTelefono} />
          <Row label="Artist Liaison" value={hoja.artistLiaisonNombre} />
          <Row label="Tel. liaison" value={hoja.artistLiaisonTelefono} />
        </Section>

        <Section title="Distancias">
          <Row
            label="Origen → Venue"
            value={hoja.distanciaIdaKm != null || hoja.duracionIdaMin != null ? `${hoja.duracionIdaMin ?? "—"} min (${hoja.distanciaIdaKm ?? "—"} km)` : null}
          />
          <Row
            label="Venue → Origen"
            value={hoja.distanciaVueltaKm != null || hoja.duracionVueltaMin != null ? `${hoja.duracionVueltaMin ?? "—"} min (${hoja.distanciaVueltaKm ?? "—"} km)` : null}
          />
        </Section>

        {hoja.runningOrder ? (
          <Section title="Running Order">
            <Text style={styles.freeText}>{hoja.runningOrder}</Text>
          </Section>
        ) : null}

        {hoja.notas ? (
          <Section title="Notas">
            <Text style={styles.freeText}>{hoja.notas}</Text>
          </Section>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backButton: { alignSelf: "flex-start", marginBottom: 8, paddingHorizontal: 20, marginTop: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 12, marginBottom: 16 },
  editButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  editText: { color: "#000", fontWeight: "700", fontSize: 13.5 },
  deleteButton: { backgroundColor: "rgba(229,72,77,0.14)", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  deleteText: { color: "#e5484d", fontWeight: "700", fontSize: 13.5 },
  sections: { paddingHorizontal: 20, gap: 12 },
  section: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14, gap: 7 },
  sectionTitle: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: "#8b8e97", fontSize: 13 },
  rowValue: { color: "#fff", fontSize: 13, textAlign: "right", flexShrink: 1 },
  freeText: { color: "#fff", fontSize: 13, lineHeight: 19 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 40 },
});
