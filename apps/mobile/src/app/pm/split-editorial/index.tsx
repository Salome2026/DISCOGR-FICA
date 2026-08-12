import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { Screen } from "@/components/screen";
import { searchSplitPeople, searchSplitTracks, createSplit } from "@discografica/shared/api/editorialSplits";
import type { SplitPersonInput, SplitPersonOption, SplitTrackOption } from "@discografica/shared/types/editorialSplits";

// Percent scaled by 100, rounded to an integer (16.8% -> 1680) — matches
// the server so "does this add up to 50%" is an exact integer comparison,
// never a floating-point one.
function parsePercent(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatX100(x100: number): string {
  return (x100 / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Row = {
  key: string;
  personId: string | null;
  personName: string;
  isNew: boolean;
  newEmail: string;
  percentRaw: string;
};

function newRow(): Row {
  return { key: Math.random().toString(36).slice(2), personId: null, personName: "", isNew: false, newEmail: "", percentRaw: "" };
}

function TrackPicker({ selected, onSelect }: { selected: SplitTrackOption | null; onSelect: (t: SplitTrackOption | null) => void }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [results, setResults] = useState<SplitTrackOption[]>([]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    searchSplitTracks(debounced).then((d) => setResults(d.tracks ?? []));
  }, [debounced]);

  if (selected) {
    return (
      <View style={styles.chip}>
        <View style={{ flex: 1 }}>
          <Text style={styles.chipTitle}>{selected.track}</Text>
          <Text style={styles.chipMeta}>
            {selected.artistDisplay}
            {selected.sello ? ` · ${selected.sello}` : ""}
          </Text>
        </View>
        <Pressable onPress={() => onSelect(null)}>
          <Text style={styles.changeLink}>Cambiar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Buscá por canción o artista..."
        placeholderTextColor={theme.text3}
        value={query}
        onChangeText={setQuery}
      />
      {query.trim().length > 0 && (
        <View style={styles.dropdown}>
          {results.map((t) => (
            <Pressable key={t.id} style={styles.dropdownItem} onPress={() => { onSelect(t); setQuery(""); }}>
              <Text style={styles.dropdownItemText}>{t.track}</Text>
              <Text style={styles.dropdownItemMeta}>
                {t.artistDisplay}
                {t.sello ? ` · ${t.sello}` : ""}
              </Text>
            </Pressable>
          ))}
          {results.length === 0 && (
            <View style={styles.dropdownItem}>
              <Text style={styles.dropdownItemMeta}>No encontramos ninguna canción con ese nombre.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PersonSlot({ row, onChange, onRemove }: { row: Row; onChange: (patch: Partial<Row>) => void; onRemove: () => void }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [results, setResults] = useState<SplitPersonOption[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    searchSplitPeople(debounced).then((d) => setResults(d.people ?? []));
  }, [debounced]);

  const resolved = row.personName.trim().length > 0;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {!resolved ? (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la persona..."
              placeholderTextColor={theme.text3}
              value={query}
              onChangeText={setQuery}
            />
            {query.trim().length > 0 && (
              <View style={styles.dropdown}>
                {results.map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      onChange({ personId: p.id, personName: p.nombreArtistico, isNew: false });
                      setQuery("");
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{p.nombreArtistico}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    onChange({ personId: null, personName: query.trim(), isNew: true });
                    setCreating(true);
                    setQuery("");
                  }}
                >
                  <Text style={styles.dropdownCreate}>+ Crear a &quot;{query.trim()}&quot;</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.resolvedChip}>
              <Text style={styles.resolvedName} numberOfLines={1}>{row.personName}</Text>
              {row.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>Nuevo</Text>
                </View>
              )}
              <Pressable onPress={() => { onChange({ personId: null, personName: "", isNew: false, newEmail: "" }); setCreating(false); }}>
                <Text style={styles.changeLink}>Cambiar</Text>
              </Pressable>
            </View>
            {row.isNew && creating && (
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                placeholder="Email (opcional)"
                placeholderTextColor={theme.text3}
                value={row.newEmail}
                onChangeText={(v) => onChange({ newEmail: v })}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
          </>
        )}
      </View>
      <TextInput
        style={[styles.input, styles.percentInput]}
        placeholder="0%"
        placeholderTextColor={theme.text3}
        value={row.percentRaw}
        onChangeText={(v) => onChange({ percentRaw: v })}
        keyboardType="decimal-pad"
      />
      <Pressable onPress={onRemove} hitSlop={8} style={styles.removeButton}>
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  );
}

function SplitSection({ title, rows, setRows }: { title: string; rows: Row[]; setRows: (rows: Row[]) => void }) {
  const sum = rows.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const statusText =
    sum === 5000
      ? `${formatX100(sum)}% / 50% ✓`
      : sum < 5000
        ? `${formatX100(sum)}% / 50% — Falta ${formatX100(5000 - sum)}%`
        : `${formatX100(sum)}% / 50% — Te pasaste ${formatX100(sum - 5000)}%`;

  function updateRow(key: string, patch: Partial<Row>) {
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((r) => (
        <PersonSlot key={r.key} row={r} onChange={(patch) => updateRow(r.key, patch)} onRemove={() => setRows(rows.filter((x) => x.key !== r.key))} />
      ))}
      <Pressable style={styles.addPerson} onPress={() => setRows([...rows, newRow()])}>
        <Text style={styles.addPersonText}>+ Agregar persona</Text>
      </Pressable>
      <Text style={[styles.total, sum === 5000 ? styles.totalOk : styles.totalWarn]}>{statusText}</Text>
    </View>
  );
}

export default function SplitEditorialScreen() {
  const [track, setTrack] = useState<SplitTrackOption | null>(null);
  const [letra, setLetra] = useState<Row[]>([newRow()]);
  const [musica, setMusica] = useState<Row[]>([newRow()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const letraSum = letra.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const musicaSum = musica.reduce((s, r) => s + (parsePercent(r.percentRaw) ?? 0), 0);
  const rowsReady = (rows: Row[]) => rows.length > 0 && rows.every((r) => r.personName.trim() && (parsePercent(r.percentRaw) ?? 0) > 0);
  const canSubmit = !!track && letraSum === 5000 && musicaSum === 5000 && rowsReady(letra) && rowsReady(musica);

  function toInput(rows: Row[]): SplitPersonInput[] {
    return rows.map((r) =>
      r.isNew
        ? { newPerson: { nombreArtistico: r.personName, email: r.newEmail.trim() || null }, percentX100: parsePercent(r.percentRaw) ?? 0 }
        : { personId: r.personId!, percentX100: parsePercent(r.percentRaw) ?? 0 }
    );
  }

  async function handleSubmit() {
    if (!canSubmit || !track) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSplit({ catalogTrackId: track.id, letra: toInput(letra), musica: toInput(musica) });
      setDone(true);
      setTimeout(() => router.push("/pm"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el split.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Split editorial" subtitle="Cargá quién cobra letra y música de una canción." onBack={() => router.back()} scroll={false}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {done ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ Listo. El split ya está en Publishing.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Elegí la canción</Text>
              <TrackPicker selected={track} onSelect={setTrack} />

              {track && (
                <>
                  <SplitSection title="LETRA" rows={letra} setRows={setLetra} />
                  <SplitSection title="MÚSICA" rows={musica} setRows={setMusica} />
                </>
              )}

              {error && <Text style={styles.error}>{error}</Text>}

              {track && (
                <View style={styles.submitBar}>
                  {!canSubmit && <Text style={styles.submitHint}>Completá letra y música al 50% para enviar.</Text>}
                  <Pressable style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]} disabled={!canSubmit || submitting} onPress={handleSubmit}>
                    {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Enviar split</Text>}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.space.xl, paddingBottom: theme.space["4xl"] },
  fieldLabel: { color: theme.text2, ...theme.type.small, fontWeight: "700", marginBottom: theme.space.sm },
  input: { backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 1, color: theme.text1, fontSize: 13.5 },
  chip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.space.md, backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, padding: theme.space.md },
  chipTitle: { color: theme.text1, ...theme.type.bodyStrong },
  chipMeta: { color: theme.text3, ...theme.type.small, marginTop: 2 },
  changeLink: { color: theme.text3, fontSize: 11.5, textDecorationLine: "underline" },
  dropdown: { backgroundColor: theme.bg1, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, marginTop: 4, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 1, borderBottomWidth: 1, borderBottomColor: theme.lineSoft },
  dropdownItemText: { color: theme.text1, fontSize: 13 },
  dropdownItemMeta: { color: theme.text3, fontSize: 11.5, marginTop: 2 },
  dropdownCreate: { color: theme.accentColor, fontSize: 13, fontWeight: "600" },

  section: { marginTop: theme.space.xl },
  sectionTitle: { color: theme.text1, ...theme.type.h3, marginBottom: theme.space.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: theme.space.sm, marginBottom: theme.space.sm },
  percentInput: { width: 76, textAlign: "right" },
  removeButton: { paddingVertical: theme.space.sm, paddingHorizontal: 4 },
  removeText: { color: theme.text3, fontSize: 20, lineHeight: 20 },
  addPerson: { borderWidth: 1, borderStyle: "dashed", borderColor: theme.lineSoft, borderRadius: theme.radiusSm, paddingVertical: theme.space.sm + 1, paddingHorizontal: theme.space.md },
  addPersonText: { color: theme.text2, fontSize: 13 },
  total: { marginTop: theme.space.sm, ...theme.type.smallStrong },
  totalOk: { color: theme.goodInk },
  totalWarn: { color: theme.warnInk },

  resolvedChip: { flexDirection: "row", alignItems: "center", gap: theme.space.sm, backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 1 },
  resolvedName: { color: theme.text1, fontSize: 13.5, flex: 1 },
  newBadge: { backgroundColor: theme.accentGlassBg, borderRadius: theme.radiusPill, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText: { color: theme.accentColor, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },

  error: { color: theme.critInk, fontSize: 12.5, marginTop: theme.space.md },
  submitBar: { marginTop: theme.space.xl, alignItems: "flex-end", gap: theme.space.sm },
  submitHint: { color: theme.text3, fontSize: 12.5 },
  submitButton: { backgroundColor: theme.accentColor, borderRadius: theme.radiusSm, paddingVertical: theme.space.md, paddingHorizontal: theme.space.xl, alignItems: "center", minWidth: 160 },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: "#000", fontWeight: "700", fontSize: 14 },
  successBox: { backgroundColor: theme.goodBg, borderRadius: theme.radiusMd, padding: theme.space.xl, alignItems: "center", marginTop: theme.space.xl },
  successText: { color: theme.goodInk, fontSize: 14, textAlign: "center" },
});
