import "@/lib/api"; // wires up the shared API client (configureApiClient) before anything else fetches
import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "@discografica/shared/theme";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginScreen } from "@/components/login-screen";

function Gate() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accentColor} />
      </View>
    );
  }
  if (status === "signedOut") {
    return <LoginScreen />;
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg0 } }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={styles.root}>
        <StatusBar style="light" />
        <Gate />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg0 },
});
