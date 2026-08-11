import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, Text, Pressable, StyleSheet, Image } from "react-native";
import { searchArtists, type ArtistResult } from "@discografica/shared/api/artists";

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <Image source={{ uri: url }} style={styles.avatarImg} />;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarText}>{initials || "?"}</Text>
    </View>
  );
}

export function ArtistPicker({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelect: (artist: ArtistResult | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQuery(value), [value]);

  function handleChange(v: string) {
    setQuery(v);
    onChange(v);
    onSelect(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchArtists(v);
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // silencioso — el campo sigue disponible para carga manual
      }
    }, 250);
  }

  function pick(a: ArtistResult) {
    setQuery(a.name);
    onChange(a.name);
    onSelect(a);
    setOpen(false);
  }

  return (
    <View style={{ position: "relative", zIndex: 20 }}>
      <TextInput
        value={query}
        onChangeText={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Nombre del artista"
        placeholderTextColor="#5a5d68"
        style={styles.input}
      />
      {open && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((a) => (
            <Pressable key={a.id} onPress={() => pick(a)} style={styles.option}>
              <Avatar name={a.name} url={a.photoUrl} />
              <Text style={styles.optionText}>{a.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#15161a",
    borderWidth: 1,
    borderColor: "#2a2b30",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: "#1c1d22",
    borderWidth: 1,
    borderColor: "#2a2b30",
    borderRadius: 10,
    maxHeight: 220,
    overflow: "hidden",
  },
  option: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  optionText: { color: "#fff", fontSize: 14 },
  avatarImg: { width: 22, height: 22, borderRadius: 6 },
  avatarFallback: { width: 22, height: 22, borderRadius: 6, backgroundColor: "#3fc6d1", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#000", fontWeight: "700", fontSize: 9 },
});
