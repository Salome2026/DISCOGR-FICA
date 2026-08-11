import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { listAdminArtists, upsertAdminArtist } from "@discografica/shared/api/admin";
import { SELLOS } from "@discografica/shared/sellos";
import type { Artist } from "@discografica/shared/types/admin";

function completenessColor(a: Artist): string {
  const n = [a.instagram, a.tiktok, a.youtube, a.spotify].filter(Boolean).length;
  return n === 0 ? "#e5484d" : n < 2 ? "#d9a441" : "#7fae6f";
}

function ArtistFormModal({ artist, onClose, onSaved }: { artist: Artist | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(artist?.name ?? "");
  const [aliases, setAliases] = useState(artist?.aliases.join(", ") ?? "");
  const [sello, setSello] = useState(artist?.sello ?? "");
  const [instagram, setInstagram] = useState(artist?.instagram ?? "");
  const [tiktok, setTiktok] = useState(artist?.tiktok ?? "");
  const [youtube, setYoutube] = useState(artist?.youtube ?? "");
  const [spotify, setSpotify] = useState(artist?.spotify ?? "");
  const [chartmetricId, setChartmetricId] = useState(artist?.chartmetricId?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickingSello, setPickingSello] = useState(false);

  async function submit() {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertAdminArtist({ id: artist?.id, name, aliases, sello: sello || null, instagram, tiktok, youtube, spotify, chartmetricId });
      onSaved();
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>{artist ? "Editar artista" : "Nuevo artista"}</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput value={name} onChangeText={setName} placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>Alias (separados por coma)</Text>
          <TextInput value={aliases} onChangeText={setAliases} placeholder="Ej: Nico Mattioli, Nico M" placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>Sello</Text>
          <Pressable onPress={() => setPickingSello(true)} style={styles.input}>
            <Text style={{ color: sello ? "#fff" : "#5a5d68", fontSize: 14 }}>{sello || "Sin asignar / distribución"}</Text>
          </Pressable>
          <Text style={styles.label}>Instagram (link completo)</Text>
          <TextInput value={instagram} onChangeText={setInstagram} placeholder="https://instagram.com/..." autoCapitalize="none" placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>TikTok (link completo)</Text>
          <TextInput value={tiktok} onChangeText={setTiktok} placeholder="https://tiktok.com/@..." autoCapitalize="none" placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>YouTube (link completo)</Text>
          <TextInput value={youtube} onChangeText={setYoutube} placeholder="https://youtube.com/@..." autoCapitalize="none" placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>Spotify (link completo)</Text>
          <TextInput value={spotify} onChangeText={setSpotify} placeholder="https://open.spotify.com/artist/..." autoCapitalize="none" placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>Chartmetric ID (opcional)</Text>
          <TextInput value={chartmetricId} onChangeText={setChartmetricId} placeholder="Ej: 1234567" keyboardType="number-pad" placeholderTextColor="#5a5d68" style={styles.input} />

          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            <Pressable onPress={submit} disabled={saving} style={styles.saveButton}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Guardar</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {pickingSello && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setPickingSello(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Elegir sello</Text>
              <Pressable onPress={() => { setSello(""); setPickingSello(false); }} style={styles.roleOption}>
                <Text style={styles.roleOptionText}>Sin asignar / distribución</Text>
              </Pressable>
              {SELLOS.map((s) => (
                <Pressable key={s} onPress={() => { setSello(s); setPickingSello(false); }} style={styles.roleOption}>
                  <Text style={[styles.roleOptionText, sello === s && styles.roleOptionTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

export default function AdminArtistasScreen() {
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Artist | "new" | null>(null);

  const load = useCallback(() => {
    listAdminArtists().then((d) => setArtists(d.artists ?? [])).catch(() => setArtists([]));
  }, []);

  useEffect(load, [load]);

  const q = search.trim().toLowerCase();
  const visible = (artists ?? []).filter((a) => a.name.toLowerCase().includes(q));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.title}>Artistas</Text>
          <Pressable onPress={() => setEditing("new")} style={styles.newButton}>
            <Text style={styles.newButtonText}>+ Nuevo</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Redes oficiales de cada artista, usadas para el Plan de Marketing con IA</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Buscar artista..." placeholderTextColor="#5a5d68" style={styles.searchInput} />
      </View>

      {artists === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.list}>
          {visible.map((a) => (
            <Pressable key={a.id} onPress={() => setEditing(a)} style={styles.card}>
              <View style={[styles.dot, { backgroundColor: completenessColor(a) }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardName}>{a.name}</Text>
                <Text style={styles.cardMeta}>{a.sello ?? "Sin sello"}</Text>
              </View>
              <Text style={styles.cardLinks}>
                {[a.instagram && "IG", a.tiktok && "TT", a.youtube && "YT", a.spotify && "SP"].filter(Boolean).join(" · ") || "Sin redes"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {editing && (
        <ArtistFormModal
          artist={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  newButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newButtonText: { color: "#000", fontWeight: "700", fontSize: 12.5 },
  subtitle: { color: "#8b8e97", fontSize: 12, marginTop: 6, lineHeight: 16 },
  toolbar: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 13.5 },
  list: { paddingHorizontal: 20, gap: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, padding: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { color: "#fff", fontSize: 13.5, fontWeight: "600" },
  cardMeta: { color: "#8b8e97", fontSize: 11, marginTop: 2 },
  cardLinks: { color: "#5a5d68", fontSize: 10.5 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0c0c0e", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", padding: 20, borderWidth: 1, borderColor: "#2a2b30", borderBottomWidth: 0 },
  sheetTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  label: { color: "#8b8e97", fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 14 },
  error: { color: "#e5484d", fontSize: 12, marginTop: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelText: { color: "#8b8e97", fontWeight: "600", fontSize: 13.5 },
  saveButton: { flex: 1, backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveText: { color: "#000", fontWeight: "700", fontSize: 13.5 },
  roleOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2a2b30" },
  roleOptionText: { color: "#8b8e97", fontSize: 14 },
  roleOptionTextActive: { color: "#3fc6d1", fontWeight: "700" },
});
