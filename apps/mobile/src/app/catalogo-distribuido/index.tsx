import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { CatalogTracksPanel } from "@/components/catalog-tracks-panel";

export default function CatalogoDistribuidoScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Catálogo Distribuido</Text>
        <Text style={styles.subtitle}>Fonogramas distribuidos por VPO sin sello asignado</Text>
      </View>

      <CatalogTracksPanel unassigned emptyMessage="No hay fonogramas sin asignar. Todo el catálogo tiene un sello." />
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
});
