import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";

export default function PmLandingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="¿Qué querés cargar?" onBack={() => router.back()} scroll={false}>
        <View style={styles.buttons}>
          <Pressable onPress={() => router.push("/pm/split-editorial")}>
            <GlassCard radius={theme.radiusXl} style={styles.bigCard}>
              <Text style={styles.bigTitle}>Split editorial</Text>
              <Text style={styles.bigSub}>Cargá quién cobra letra y música de una canción.</Text>
            </GlassCard>
          </Pressable>
          <Pressable onPress={() => router.push("/pm/fonograma")}>
            <GlassCard radius={theme.radiusXl} style={styles.bigCard}>
              <Text style={styles.bigTitle}>Fonograma</Text>
              <Text style={styles.bigSub}>Cargá un single, EP o álbum nuevo.</Text>
            </GlassCard>
          </Pressable>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  buttons: { paddingHorizontal: theme.space.xl },
  bigCard: { padding: theme.space["2xl"], marginBottom: theme.space.lg, minHeight: 130, justifyContent: "center" },
  bigTitle: { color: theme.text1, ...theme.type.h2, marginBottom: theme.space.xs },
  bigSub: { color: theme.text3, ...theme.type.small, lineHeight: 18 },
});
