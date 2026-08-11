import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { createShow, updateShow, deleteShow } from "@discografica/shared/api/booking";
import { ESTADOS_SHOW, type BookingShow } from "@discografica/shared/types/booking";
import { ArtistPicker } from "./artist-picker";
import type { ArtistResult } from "@discografica/shared/api/artists";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.chip, value === opt && styles.chipActive]}>
          <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Sheet-imported shows (show.source === "sheet") are read-only for
// artista/fecha/notas — the Google Sheet owns those, a re-sync would
// overwrite local edits — only ubicación is editable, same restriction as
// the web's SheetShowModal (app/panel/booking/ShowCalendar.tsx).
export function ShowFormScreen({ show }: { show: BookingShow | null }) {
  const isSheetShow = show?.source === "sheet";

  const [artistName, setArtistName] = useState(show?.artistName ?? "");
  const [fecha, setFecha] = useState(show?.fecha ?? "");
  const [hora, setHora] = useState(show?.hora ?? "");
  const [venue, setVenue] = useState(show?.venue ?? "");
  const [ciudad, setCiudad] = useState(show?.ciudad ?? "");
  const [provincia, setProvincia] = useState(show?.provincia ?? "");
  const [pais, setPais] = useState(show?.pais ?? "");
  const [estado, setEstado] = useState(show?.estado ?? "Pendiente");
  const [notas, setNotas] = useState(show?.notas ?? "");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!isSheetShow && (!artistName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fecha))) {
      setError("Artista y fecha (AAAA-MM-DD) son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        artistName: show?.artistName ?? artistName.trim(),
        fecha: show?.fecha ?? fecha,
        hora: show?.hora ?? (hora || null),
        venue: show?.venue ?? (venue || null),
        ciudad: ciudad || null,
        provincia: provincia || null,
        pais: pais || null,
        estado: show?.estado ?? estado,
        notas: show?.notas ?? (notas || null),
      };
      const result = show ? await updateShow(show.id, body) : await createShow(body);
      router.replace(`/booking/${result.show.id}`);
    } catch {
      setError("No se pudo guardar. Revisá los datos e intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!show) return;
    Alert.alert("Eliminar show", "¿Seguro que querés eliminar este show?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await deleteShow(show.id);
            router.replace("/booking");
          } catch {
            Alert.alert("Error", "No se pudo eliminar el show.");
            setSaving(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{show ? "Editar show" : "Nuevo show"}</Text>
      {isSheetShow && (
        <Text style={styles.subtitle}>
          Importado de la planilla — el artista, la fecha y el detalle se editan ahí. Acá solo se puede completar la
          ubicación para que aparezca en el mapa.
        </Text>
      )}

      {isSheetShow ? (
        <>
          <Field label="Artista"><Text style={styles.readonlyValue}>{show!.artistName}</Text></Field>
          <Field label="Fecha"><Text style={styles.readonlyValue}>{show!.fecha}</Text></Field>
          {show!.notas ? <Field label="Detalle"><Text style={styles.readonlyValue}>{show!.notas}</Text></Field> : null}
        </>
      ) : (
        <>
          <Field label="Artista">
            <ArtistPicker value={artistName} onChange={setArtistName} onSelect={(_a: ArtistResult | null) => {}} />
          </Field>
          <Field label="Fecha (AAAA-MM-DD)">
            <TextInput value={fecha} onChangeText={setFecha} placeholder="2026-08-20" placeholderTextColor="#5a5d68" style={styles.input} />
          </Field>
          <Field label="Hora (HH:MM)">
            <TextInput value={hora} onChangeText={setHora} placeholder="21:30" placeholderTextColor="#5a5d68" style={styles.input} />
          </Field>
          <Field label="Venue">
            <TextInput value={venue} onChangeText={setVenue} placeholderTextColor="#5a5d68" style={styles.input} />
          </Field>
        </>
      )}

      <Field label="Ciudad">
        <TextInput value={ciudad} onChangeText={setCiudad} placeholderTextColor="#5a5d68" style={styles.input} />
      </Field>
      <Field label="Provincia">
        <TextInput value={provincia} onChangeText={setProvincia} placeholderTextColor="#5a5d68" style={styles.input} />
      </Field>
      <Field label="País">
        <TextInput value={pais} onChangeText={setPais} placeholderTextColor="#5a5d68" style={styles.input} />
      </Field>

      {!isSheetShow && (
        <>
          <Field label="Estado">
            <ChipRow options={[...ESTADOS_SHOW]} value={estado} onChange={setEstado} />
          </Field>
          <Field label="Notas">
            <TextInput value={notas} onChangeText={setNotas} multiline numberOfLines={3} placeholderTextColor="#5a5d68" style={[styles.input, styles.textarea]} />
          </Field>
        </>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable onPress={handleSubmit} disabled={saving} style={styles.saveButton}>
          {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Guardar</Text>}
        </Pressable>
      </View>

      {show && !isSheetShow && (
        <Pressable onPress={confirmDelete} disabled={saving} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Eliminar show</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: "#fff", fontSize: 19, fontWeight: "700" },
  subtitle: { color: "#8b8e97", fontSize: 12.5, marginTop: 6, marginBottom: 16, lineHeight: 17 },
  label: { color: "#8b8e97", fontSize: 12.5, marginBottom: 4 },
  readonlyValue: { color: "#fff", fontSize: 14 },
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
  textarea: { minHeight: 70, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#2a2b30", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#15161a" },
  chipActive: { backgroundColor: "#3fc6d1", borderColor: "#3fc6d1" },
  chipText: { color: "#8b8e97", fontSize: 12.5 },
  chipTextActive: { color: "#000", fontWeight: "700" },
  errorBox: { backgroundColor: "rgba(229,72,77,0.12)", borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: "#e5484d", fontSize: 12.5 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  cancelText: { color: "#8b8e97", fontWeight: "600", fontSize: 14 },
  saveButton: { flex: 1, backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  saveText: { color: "#000", fontWeight: "700", fontSize: 14 },
  deleteButton: { marginTop: 20, alignItems: "center", paddingVertical: 10 },
  deleteText: { color: "#e5484d", fontSize: 13, fontWeight: "600" },
});
