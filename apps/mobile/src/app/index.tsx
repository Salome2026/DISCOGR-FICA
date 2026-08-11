import React from "react";
import { View, Text, Pressable, StyleSheet, Image, ScrollView } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, type SessionUser } from "@discografica/shared/permissions";

const ROLE_LABEL: Record<string, string> = {
  admin: "Label",
  project_manager: "Project Managers",
  legal: "Legales",
  editorial: "Publishing",
  management: "Management",
  booking: "Booking",
  tourmanager: "Tour Manager",
  distribucion: "Distribución",
  marketing: "Marketing",
  artista: "Artista",
  representante: "Representante",
  invitado: "Invitado",
};

// Every module gets a button whenever the account can access it — not just
// one hardcoded per single role — so an admin (who has every permission)
// sees the full list, same as the nav links on the web dashboard.
const MODULES: { key: string; label: string; route: string; check: (u: SessionUser) => boolean }[] = [
  { key: "tourmanager", label: "Tour Manager", route: "/tourmanager", check: (u) => hasPermission(u, "ver_tourmanager") },
  { key: "booking", label: "Booking", route: "/booking", check: (u) => hasPermission(u, "ver_booking") },
  { key: "legal", label: "Legales", route: "/legal", check: (u) => hasPermission(u, "ver_legal") },
  { key: "management", label: "Management", route: "/management", check: (u) => hasPermission(u, "ver_management") },
  { key: "publishing", label: "Publishing", route: "/publishing", check: (u) => hasPermission(u, "ver_publishing") },
  { key: "pm", label: "PM", route: "/pm", check: (u) => u.role === "admin" || u.role === "project_manager" },
  { key: "playlists", label: "Playlists", route: "/playlists", check: (u) => hasPermission(u, "ver_playlists") },
  { key: "dashboard", label: "Label (Dashboard)", route: "/dashboard", check: (u) => u.role === "admin" },
];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const availableModules = MODULES.filter((m) => m.check(user));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Rol</Text>
        <Text style={styles.cardValue}>{roleLabel}</Text>
      </View>

      {availableModules.length > 0 ? (
        <View style={styles.moduleList}>
          {availableModules.map((m) => (
            <Pressable key={m.key} style={styles.moduleButton} onPress={() => router.push(m.route as never)}>
              <Text style={styles.moduleButtonText}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.note}>
          Esqueleto de la app — el módulo de {roleLabel} todavía no tiene pantallas propias acá.
        </Text>
      )}

      <Pressable style={styles.logoutButton} onPress={() => logout()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { flexGrow: 1, alignItems: "center", paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 },
  logo: { width: 140, height: 74, marginBottom: 20 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700" },
  email: { color: "#8b8e97", fontSize: 13, marginBottom: 28 },
  card: { width: "100%", backgroundColor: "#15161a", borderRadius: 12, borderWidth: 1, borderColor: "#2a2b30", padding: 16 },
  cardLabel: { color: "#5a5d68", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { color: "#fff", fontSize: 15, fontWeight: "600" },
  note: { color: "#5a5d68", fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 18 },
  moduleList: { width: "100%", marginTop: 20, gap: 10 },
  moduleButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  moduleButtonText: { color: "#000", fontWeight: "700", fontSize: 14.5 },
  logoutButton: { marginTop: 28, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: "#2a2b30" },
  logoutText: { color: "#8b8e97", fontSize: 14, fontWeight: "600" },
});
