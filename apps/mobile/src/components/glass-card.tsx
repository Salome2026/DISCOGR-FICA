import React from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@discografica/shared/theme";

// Reproduces the web's .glass / .glass-strong primitives (app/globals.css):
// backdrop-filter blur + a diagonal white-sheen gradient + a translucent
// border. RN has no backdrop-filter, so BlurView (native iOS/Android blur)
// stands in for it, with the same gradient overlay on top for the sheen.
export function GlassCard({
  children,
  strong,
  radius = theme.radiusXl,
  style,
}: {
  children: React.ReactNode;
  strong?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const gradientColors = strong
    ? (["rgba(255,255,255,0.32)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0.015)"] as const)
    : (["rgba(255,255,255,0.22)", "rgba(255,255,255,0.035)", "rgba(255,255,255,0.008)"] as const);

  return (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      <BlurView intensity={strong ? theme.glassBlurStrong : theme.glassBlur} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.border, { borderRadius: radius, borderColor: theme.glassBorder }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  border: { ...StyleSheet.absoluteFillObject, borderWidth: 1 },
  content: { position: "relative" },
});
