import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";

export default function ManagementHomeScreen() {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Management</Text>
      </View>

      <View style={styles.list}>
        <Pressable onPress={() => router.push("/management/roster")} style={styles.card}>
          <Text style={styles.cardTitle}>Roster</Text>
          <Text style={styles.cardSubtitle}>Artistas, ranking, oyentes mensuales y estado.</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/management/releases")} style={styles.card}>
          <Text style={styles.cardTitle}>Próximos lanzamientos</Text>
          <Text style={styles.cardSubtitle}>Calendario de lanzamientos del roster.</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 16, gap: 4 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#8b8e97", fontSize: 12.5 },
});
