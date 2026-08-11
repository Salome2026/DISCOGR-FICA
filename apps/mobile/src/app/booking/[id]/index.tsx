import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { getShow } from "@discografica/shared/api/booking";
import type { BookingShow } from "@discografica/shared/types/booking";

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

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [show, setShow] = useState<BookingShow | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    getShow(id).then((d) => setShow(d.show ?? null));
  }, [id]);

  if (show === undefined) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 60 }} />
      </View>
    );
  }
  if (show === null) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.empty}>Show no encontrado.</Text>
      </View>
    );
  }

  const hasCoords = show.lat != null && show.lng != null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>{show.artistName}</Text>
        <Text style={styles.subtitle}>
          {formatFecha(show.fecha)}
          {show.hora ? ` · ${show.hora}` : ""} · {show.estado}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => router.push(`/booking/${show.id}/edit`)} style={styles.editButton}>
          <Text style={styles.editText}>{show.source === "sheet" ? "Editar ubicación" : "Editar"}</Text>
        </Pressable>
      </View>

      {hasCoords ? (
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            initialRegion={{ latitude: show.lat as number, longitude: show.lng as number, latitudeDelta: 0.15, longitudeDelta: 0.15 }}
          >
            <Marker coordinate={{ latitude: show.lat as number, longitude: show.lng as number }} title={show.artistName} description={show.venue ?? show.ciudad ?? undefined} />
          </MapView>
        </View>
      ) : (
        <View style={styles.mapEmpty}>
          <Text style={styles.mapEmptyText}>Sin ubicación resuelta — no aparece en el mapa todavía.</Text>
        </View>
      )}

      <View style={styles.sections}>
        <Section title="Información general">
          <Row label="Artista" value={show.artistName} />
          <Row label="Fecha" value={formatFecha(show.fecha)} />
          <Row label="Hora" value={show.hora} />
          <Row label="Estado" value={show.estado} />
        </Section>

        <Section title="Ubicación">
          <Row label="Venue" value={show.venue} />
          <Row label="Ciudad" value={show.ciudad} />
          <Row label="Provincia" value={show.provincia} />
          <Row label="País" value={show.pais} />
        </Section>

        {show.valor ? (
          <Section title="Valor">
            <Text style={styles.freeText}>{show.valor}</Text>
          </Section>
        ) : null}

        {show.notas ? (
          <Section title="Notas">
            <Text style={styles.freeText}>{show.notas}</Text>
          </Section>
        ) : null}

        {show.source === "sheet" ? (
          <Section title="Origen">
            <Text style={styles.freeText}>Importado de la planilla de Google Sheets.</Text>
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
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 12, marginBottom: 14 },
  editButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  editText: { color: "#000", fontWeight: "700", fontSize: 13.5 },
  mapWrap: { marginHorizontal: 20, marginBottom: 16, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#2a2b30" },
  map: { width: "100%", height: 200 },
  mapEmpty: { marginHorizontal: 20, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: "#2a2b30", backgroundColor: "#15161a", height: 100, alignItems: "center", justifyContent: "center", padding: 12 },
  mapEmptyText: { color: "#5a5d68", fontSize: 12, textAlign: "center" },
  sections: { paddingHorizontal: 20, gap: 12 },
  section: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14, gap: 7 },
  sectionTitle: { color: "#5a5d68", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: "#8b8e97", fontSize: 13 },
  rowValue: { color: "#fff", fontSize: 13, textAlign: "right", flexShrink: 1 },
  freeText: { color: "#fff", fontSize: 13, lineHeight: 19 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 40 },
});
