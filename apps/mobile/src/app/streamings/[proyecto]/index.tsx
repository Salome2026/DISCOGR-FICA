import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { CatalogTracksPanel } from "@/components/catalog-tracks-panel";

// "La Juntada de los Artistas" also shows a linked acuerdos section on the
// web (app/streamings/[proyecto]/page.tsx) — that's Notion/acuerdos data
// specific to that one project, skipped here to keep this screen generic
// across every streaming project; the catalog view below covers all of them.
export default function StreamingProjectScreen() {
  const { proyecto } = useLocalSearchParams<{ proyecto: string }>();
  const proyectoName = decodeURIComponent(proyecto ?? "");

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>{proyectoName}</Text>
      </View>

      <CatalogTracksPanel project={proyectoName} emptyMessage={`Todavía no hay fonogramas en ${proyectoName}.`} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
});
