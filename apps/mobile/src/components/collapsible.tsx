import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { theme } from "@discografica/shared/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Secondary information belongs inside a collapsible section, not flat on
// the screen competing with the primary content — this is what turns a
// "wall of 8 cards" detail screen into one with a clear hierarchy: the
// important stuff stays visible, everything else is one tap away.
export function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.create(theme.durBase, "easeInEaseOut", "opacity"));
    setOpen((o) => !o);
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggle} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chevron}>{open ? "▾" : "▸"}</Text>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.bg1, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusMd, overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  title: { color: theme.text1, ...theme.type.h3 },
  chevron: { color: theme.text3, fontSize: 13 },
  body: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.lg, gap: theme.space.sm },
});
