import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { getRanking } from "@discografica/shared/api/label";
import type { RankingRow } from "@discografica/shared/types/label";

function Avatar({ r, size }: { r: RankingRow; size: number }) {
  if (r.image_url) return <Image source={{ uri: r.image_url }} style={{ width: size, height: size, borderRadius: size / 3 }} />;
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 3 }]}>
      <Text style={styles.avatarText}>{r.artist_name.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

// Mirrors app/components/RankingListeners.tsx against the same public
// GET /api/ranking — simplified to a flat ranked list (no podium/expand
// animation), top 10 by default with a search box to find anyone further down.
export function RankingListeners() {
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getRanking().then((d) => setRows(d.ranking ?? [])).catch(() => setRows([]));
  }, []);

  if (rows === null) {
    return <ActivityIndicator color="#3fc6d1" style={{ marginVertical: 20 }} />;
  }

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const searching = search.trim().length > 0;
  const listRows = searching
    ? rows.filter((r) => norm(r.artist_name).includes(norm(search.trim())))
    : expanded
      ? rows
      : rows.slice(0, 10);

  return (
    <View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar artista..."
        placeholderTextColor="#5a5d68"
        style={styles.search}
      />
      {listRows.length === 0 ? (
        <Text style={styles.empty}>Sin resultados.</Text>
      ) : (
        listRows.map((r) => (
          <View key={r.artist_id} style={styles.row}>
            <Text style={styles.rank}>{r.monthly_listeners_rank ?? "—"}</Text>
            <Avatar r={r} size={32} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{r.artist_name}</Text>
              <Text style={styles.sello} numberOfLines={1}>{r.sello ?? "Sin sello"}</Text>
            </View>
            <Text style={styles.listeners}>
              {r.monthly_listeners != null ? r.monthly_listeners.toLocaleString("es-AR") : "—"}
            </Text>
          </View>
        ))
      )}
      {!searching && rows.length > 10 && (
        <Pressable onPress={() => setExpanded((e) => !e)} style={styles.expandButton}>
          <Text style={styles.expandText}>{expanded ? "Ver menos" : `Ver los ${rows.length}`}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: "#0c0c0e",
    borderWidth: 1,
    borderColor: "#2a2b30",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#fff",
    fontSize: 13,
    marginBottom: 10,
  },
  empty: { color: "#5a5d68", fontSize: 13, textAlign: "center", paddingVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  rank: { width: 18, color: "#5a5d68", fontSize: 11.5, fontWeight: "600", textAlign: "center" },
  avatarFallback: { backgroundColor: "#3fc6d1", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#000", fontWeight: "700", fontSize: 11 },
  name: { color: "#fff", fontSize: 13, fontWeight: "600" },
  sello: { color: "#5a5d68", fontSize: 10.5, marginTop: 1 },
  listeners: { color: "#3fc6d1", fontSize: 13, fontWeight: "700" },
  expandButton: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  expandText: { color: "#8b8e97", fontSize: 12.5, fontWeight: "600" },
});
