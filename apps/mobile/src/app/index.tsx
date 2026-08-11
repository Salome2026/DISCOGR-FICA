import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { homeFor } from "@discografica/shared/permissions";

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

export default function HomeScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <View style={styles.root}>
      <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Módulo</Text>
        <Text style={styles.cardValue}>{roleLabel}</Text>
        <View style={styles.divider} />
        <Text style={styles.cardLabel}>En la web</Text>
        <Text style={styles.cardValueMuted}>{homeFor(user.role)}</Text>
      </View>

      {user.role === "tourmanager" ? (
        <Pressable style={styles.moduleButton} onPress={() => router.push("/tourmanager")}>
          <Text style={styles.moduleButtonText}>Ir a Tour Manager</Text>
        </Pressable>
      ) : user.role === "booking" ? (
        <Pressable style={styles.moduleButton} onPress={() => router.push("/booking")}>
          <Text style={styles.moduleButtonText}>Ir a Booking</Text>
        </Pressable>
      ) : user.role === "legal" ? (
        <Pressable style={styles.moduleButton} onPress={() => router.push("/legal")}>
          <Text style={styles.moduleButtonText}>Ir a Legales</Text>
        </Pressable>
      ) : (
        <Text style={styles.note}>
          Esqueleto de la app — el módulo de {roleLabel} todavía no tiene pantallas propias acá.
        </Text>
      )}

      <Pressable style={styles.logoutButton} onPress={() => logout()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  logo: { width: 140, height: 74, marginBottom: 20 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700" },
  email: { color: "#8b8e97", fontSize: 13, marginBottom: 28 },
  card: { width: "100%", backgroundColor: "#15161a", borderRadius: 12, borderWidth: 1, borderColor: "#2a2b30", padding: 16 },
  cardLabel: { color: "#5a5d68", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cardValueMuted: { color: "#8b8e97", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#2a2b30", marginVertical: 12 },
  note: { color: "#5a5d68", fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 18 },
  moduleButton: { marginTop: 24, backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 13, paddingHorizontal: 28 },
  moduleButtonText: { color: "#000", fontWeight: "700", fontSize: 14.5 },
  logoutButton: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: "#2a2b30" },
  logoutText: { color: "#8b8e97", fontSize: 14, fontWeight: "600" },
});
