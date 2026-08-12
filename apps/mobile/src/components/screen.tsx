import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { useResponsive } from "@/lib/responsive";

// The one screen shell every module screen should render through, so
// header spacing/back-button placement/content max-width is identical
// everywhere instead of each screen picking its own paddingTop guess for
// the status bar and its own back-button style. On a wide screen (tablet/
// desktop-class window) content centers into a max-width column instead
// of stretching edge-to-edge — same "readable measure" idea Linear/Notion/
// Stripe Dashboard all use, and matches the web's own .dash-inner /
// .inner max-width containers.
export function Screen({
  title,
  subtitle,
  onBack,
  headerRight,
  children,
  scroll = true,
  contentContainerStyle,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
}) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  const header = (title || onBack) && (
    <View style={[styles.header, { paddingTop: insets.top + theme.space.sm }]}>
      <View style={styles.headerTop}>
        {onBack ? (
          <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12} style={styles.backButton}>
            <Text style={styles.backText}>‹ Atrás</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {headerRight}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  const inner = (
    <View style={[styles.maxWidth, isTablet && styles.maxWidthTablet]}>
      {header}
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={styles.root}>{inner}</View>;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[{ paddingBottom: insets.bottom + theme.space["3xl"] }, contentContainerStyle]}
    >
      {inner}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg0 },
  maxWidth: { width: "100%" },
  maxWidthTablet: { maxWidth: 720, alignSelf: "center" },
  header: { paddingHorizontal: theme.space.xl, paddingBottom: theme.space.lg },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.space.sm, minHeight: 20 },
  backButton: { paddingVertical: theme.space.xs },
  backText: { color: theme.text2, fontSize: 14 },
  title: { color: theme.text1, ...theme.type.display },
  subtitle: { color: theme.text3, ...theme.type.small, marginTop: theme.space.xs },
});
