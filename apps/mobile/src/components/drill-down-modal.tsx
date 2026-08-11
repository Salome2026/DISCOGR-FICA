import React from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";

export type DrillDownField<T> = { label: string; render: (row: T) => string };

export function DrillDownModal<T>({
  title,
  subtitle,
  rows,
  fields,
  keyExtractor,
  onClose,
}: {
  title: string;
  subtitle?: string;
  rows: T[];
  fields: DrillDownField<T>[];
  keyExtractor: (row: T, index: number) => string;
  onClose: () => void;
}) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={rows}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Sin resultados.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                {fields.map((f) => (
                  <View key={f.label} style={styles.field}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <Text style={styles.fieldValue} numberOfLines={2}>{f.render(item) || "—"}</Text>
                  </View>
                ))}
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0c0c0e", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingTop: 8, borderWidth: 1, borderColor: "#2a2b30", borderBottomWidth: 0 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  title: { color: "#fff", fontSize: 17, fontWeight: "700" },
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 2 },
  closeButton: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "#2a2b30", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#8b8e97", fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", marginTop: 24 },
  row: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, padding: 12, gap: 6 },
  field: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  fieldLabel: { color: "#5a5d68", fontSize: 11, flexShrink: 0 },
  fieldValue: { color: "#fff", fontSize: 12.5, textAlign: "right", flexShrink: 1 },
});
