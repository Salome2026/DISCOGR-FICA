import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";

export default function PublishingHubScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Publishing" subtitle="Tango Made In Argentina" onBack={() => router.back()} scroll={false}>
        <View style={styles.buttons}>
          <Pressable onPress={() => router.push("/publishing/artistas")}>
            <GlassCard radius={theme.radiusXl} style={styles.bigCard}>
              <Text style={styles.bigTitle}>Datos de artistas</Text>
              <Text style={styles.bigSub}>Base de artistas propios y externos.</Text>
            </GlassCard>
          </Pressable>
          <Pressable onPress={() => router.push("/publishing/splits")}>
            <GlassCard radius={theme.radiusXl} style={styles.bigCard}>
              <Text style={styles.bigTitle}>Splits pendientes de envío</Text>
              <Text style={styles.bigSub}>Splits cargados por Project Managers.</Text>
            </GlassCard>
          </Pressable>
          <Pressable onPress={() => router.push("/publishing/splits/historico")}>
            <GlassCard radius={theme.radiusXl} style={styles.bigCard}>
              <Text style={styles.bigTitle}>Histórico de splits</Text>
              <Text style={styles.bigSub}>Todos los splits ya enviados.</Text>
            </GlassCard>
          </Pressable>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  buttons: { paddingHorizontal: theme.space.xl },
  bigCard: { padding: theme.space.xl, marginBottom: theme.space.md, minHeight: 96, justifyContent: "center" },
  bigTitle: { color: theme.text1, ...theme.type.h3, marginBottom: theme.space.xs },
  bigSub: { color: theme.text3, ...theme.type.small, lineHeight: 18 },
});
