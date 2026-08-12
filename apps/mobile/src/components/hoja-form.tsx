import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { createHoja, updateHoja, resolveAddress, previewRoute } from "@discografica/shared/api/tourManager";
import type { HojaDeRuta } from "@discografica/shared/types/tourManager";
import { ArtistPicker } from "./artist-picker";
import { Collapsible } from "./collapsible";
import type { ArtistResult } from "@discografica/shared/api/artists";

const TIPOS_EVENTO = ["Show", "Boliche", "Festival", "Evento privado", "Radio", "TV", "Prensa", "Otro"];
const ORIGEN_LABELS = ["Domicilio Artista", "Hotel", "Aeropuerto", "Otro"];
const BUFFER_PRESETS = [30, 45, 60, 90, 120];

function timeToMinutes(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function minutesToTime(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function toIntOrNull(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function toNumOrNull(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: theme.space.md }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable key={opt} onPress={() => onChange(value === opt ? "" : opt)} style={[styles.chip, value === opt && styles.chipActive]}>
          <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function HojaFormScreen({ hoja }: { hoja: HojaDeRuta | null }) {
  const [artistName, setArtistName] = useState(hoja?.artistName ?? "");
  const [artistId, setArtistId] = useState<string | null>(hoja?.artistId ?? null);
  const [fecha, setFecha] = useState(hoja?.fecha ?? "");
  const [horaShow, setHoraShow] = useState(hoja?.horaShow ?? "");
  const [tipoEvento, setTipoEvento] = useState(hoja?.tipoEvento ?? "");
  const [venue, setVenue] = useState(hoja?.venue ?? "");
  const [venueDireccion, setVenueDireccion] = useState(hoja?.venueDireccion ?? "");
  const [origenLabel, setOrigenLabel] = useState(hoja?.origenLabel ?? "");
  const [origenDireccion, setOrigenDireccion] = useState(hoja?.origenDireccion ?? "");

  const [venueResolving, setVenueResolving] = useState(false);
  const [venueLat, setVenueLat] = useState<number | null>(hoja?.venueLat ?? null);
  const [venueLng, setVenueLng] = useState<number | null>(hoja?.venueLng ?? null);
  const [venueFullAddress, setVenueFullAddress] = useState(hoja?.venueFullAddress ?? "");
  const [venueCiudad, setVenueCiudad] = useState(hoja?.venueCiudad ?? "");
  const [venueProvincia, setVenueProvincia] = useState(hoja?.venueProvincia ?? "");
  const [venuePais, setVenuePais] = useState(hoja?.venuePais ?? "");

  const [origenResolving, setOrigenResolving] = useState(false);
  const [origenLat, setOrigenLat] = useState<number | null>(hoja?.origenLat ?? null);
  const [origenLng, setOrigenLng] = useState<number | null>(hoja?.origenLng ?? null);
  const [origenFullAddress, setOrigenFullAddress] = useState(hoja?.origenFullAddress ?? "");

  async function handleResolveAddress(kind: "venue" | "origen", value: string) {
    if (!value.trim()) return;
    const setResolving = kind === "venue" ? setVenueResolving : setOrigenResolving;
    setResolving(true);
    try {
      const data = await resolveAddress(value);
      if (!data.resolved || data.lat == null || data.lng == null) return;
      if (kind === "venue") {
        setVenueLat(data.lat);
        setVenueLng(data.lng);
        setVenueFullAddress(data.fullAddress ?? "");
        setVenueCiudad(data.ciudad ?? "");
        setVenueProvincia(data.provincia ?? "");
        setVenuePais(data.pais ?? "");
      } else {
        setOrigenLat(data.lat);
        setOrigenLng(data.lng);
        setOrigenFullAddress(data.fullAddress ?? "");
      }
    } catch {
      // silencioso — el campo sigue disponible para carga manual
    } finally {
      setResolving(false);
    }
  }

  const [duracionShowMin, setDuracionShowMin] = useState(hoja?.duracionShowMin?.toString() ?? "");
  const [pax, setPax] = useState(hoja?.pax?.toString() ?? "");
  const [venueContactoNombre, setVenueContactoNombre] = useState(hoja?.venueContactoNombre ?? "");
  const [venueContactoTelefono, setVenueContactoTelefono] = useState(hoja?.venueContactoTelefono ?? "");
  const [contactoArtistaNombre, setContactoArtistaNombre] = useState(hoja?.contactoArtistaNombre ?? "");
  const [contactoArtistaTelefono, setContactoArtistaTelefono] = useState(hoja?.contactoArtistaTelefono ?? "");
  const [artistLiaisonNombre, setArtistLiaisonNombre] = useState(hoja?.artistLiaisonNombre ?? "");
  const [artistLiaisonTelefono, setArtistLiaisonTelefono] = useState(hoja?.artistLiaisonTelefono ?? "");
  const [driverNombre, setDriverNombre] = useState(hoja?.driverNombre ?? "");
  const [driverTelefono, setDriverTelefono] = useState(hoja?.driverTelefono ?? "");
  const [runningOrder, setRunningOrder] = useState(hoja?.runningOrder ?? "");
  const [notas, setNotas] = useState(hoja?.notas ?? "");
  const [estado, setEstado] = useState(hoja?.estado ?? "Borrador");

  const [horaSalida, setHoraSalida] = useState(hoja?.horaSalida ?? "");
  const [horaLlegadaVenue, setHoraLlegadaVenue] = useState(hoja?.horaLlegadaVenue ?? "");
  const [horaSalidaVenue, setHoraSalidaVenue] = useState(hoja?.horaSalidaVenue ?? "");
  const [horaLlegadaDestino, setHoraLlegadaDestino] = useState(hoja?.horaLlegadaDestino ?? "");
  const [distanciaIdaKm, setDistanciaIdaKm] = useState(hoja?.distanciaIdaKm?.toString() ?? "");
  const [duracionIdaMin, setDuracionIdaMin] = useState(hoja?.duracionIdaMin?.toString() ?? "");
  const [distanciaVueltaKm, setDistanciaVueltaKm] = useState(hoja?.distanciaVueltaKm?.toString() ?? "");
  const [duracionVueltaMin, setDuracionVueltaMin] = useState(hoja?.duracionVueltaMin?.toString() ?? "");
  const [bufferPrepMin, setBufferPrepMin] = useState(String(hoja?.bufferPrepMin ?? 30));
  const [rutaIdaGeojson, setRutaIdaGeojson] = useState<unknown | null>(hoja?.rutaIdaGeojson ?? null);
  const [rutaVueltaGeojson, setRutaVueltaGeojson] = useState<unknown | null>(hoja?.rutaVueltaGeojson ?? null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeMsg, setRouteMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Se recalcula solo apenas cambia el horario del show, el origen, el
  // venue o la anticipación — mismo criterio que la web (ver HojaForm.tsx).
  useEffect(() => {
    if (venueLat == null || venueLng == null || origenLat == null || origenLng == null) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setCalculatingRoute(true);
      setRouteMsg(null);
      try {
        const [idaRes, vueltaRes] = await Promise.all([
          previewRoute({ lat: origenLat, lng: origenLng }, { lat: venueLat, lng: venueLng }),
          previewRoute({ lat: venueLat, lng: venueLng }, { lat: origenLat, lng: origenLng }),
        ]);
        if (cancelled) return;

        let idaMin: number | null = null;
        if (idaRes.resolved) {
          setDistanciaIdaKm(String(idaRes.distanceKm));
          setDuracionIdaMin(String(idaRes.durationMin));
          setRutaIdaGeojson(idaRes.geometry);
          idaMin = idaRes.durationMin ?? null;
        }
        if (vueltaRes.resolved) {
          setDistanciaVueltaKm(String(vueltaRes.distanceKm));
          setDuracionVueltaMin(String(vueltaRes.durationMin));
          setRutaVueltaGeojson(vueltaRes.geometry);
        }
        if (!idaRes.resolved && !vueltaRes.resolved) {
          setRouteMsg("No se pudo calcular la ruta automáticamente — completá los horarios manualmente.");
          return;
        }

        const showMin = timeToMinutes(horaShow);
        const buffer = parseInt(bufferPrepMin, 10) || 0;
        if (showMin != null) {
          const llegadaVenue = showMin - buffer;
          setHoraLlegadaVenue(minutesToTime(llegadaVenue));
          if (idaMin != null) setHoraSalida(minutesToTime(llegadaVenue - idaMin));
        }
      } finally {
        if (!cancelled) setCalculatingRoute(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [horaShow, bufferPrepMin, venueLat, venueLng, origenLat, origenLng]);

  useEffect(() => {
    const showMin = timeToMinutes(horaShow);
    if (showMin == null) return;
    const showDuration = parseInt(duracionShowMin, 10) || 0;
    const salidaVenue = showMin + showDuration;
    if (!horaSalidaVenue) setHoraSalidaVenue(minutesToTime(salidaVenue));
    const vueltaMin = toIntOrNull(duracionVueltaMin);
    if (vueltaMin != null && !horaLlegadaDestino) setHoraLlegadaDestino(minutesToTime(salidaVenue + vueltaMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaShow, duracionShowMin, duracionVueltaMin]);

  async function handleSubmit() {
    setError(null);
    if (!artistName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setError("Artista y fecha (AAAA-MM-DD) son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        artistName: artistName.trim(),
        fecha,
        horaShow: horaShow || null,
        tipoEvento: tipoEvento || null,
        venue: venue || null,
        venueDireccion: venueDireccion || null,
        origenLabel: origenLabel || null,
        origenDireccion: origenDireccion || null,
        venueLat,
        venueLng,
        venueFullAddress: venueFullAddress || null,
        venueCiudad: venueCiudad || null,
        venueProvincia: venueProvincia || null,
        venuePais: venuePais || null,
        origenLat,
        origenLng,
        origenFullAddress: origenFullAddress || null,
        distanciaIdaKm: toNumOrNull(distanciaIdaKm),
        duracionIdaMin: toIntOrNull(duracionIdaMin),
        distanciaVueltaKm: toNumOrNull(distanciaVueltaKm),
        duracionVueltaMin: toIntOrNull(duracionVueltaMin),
        horaSalida: horaSalida || null,
        horaLlegadaVenue: horaLlegadaVenue || null,
        horaSalidaVenue: horaSalidaVenue || null,
        horaLlegadaDestino: horaLlegadaDestino || null,
        duracionShowMin: toIntOrNull(duracionShowMin),
        pax: toIntOrNull(pax),
        venueContactoNombre: venueContactoNombre || null,
        venueContactoTelefono: venueContactoTelefono || null,
        contactoArtistaNombre: contactoArtistaNombre || null,
        contactoArtistaTelefono: contactoArtistaTelefono || null,
        artistLiaisonNombre: artistLiaisonNombre || null,
        artistLiaisonTelefono: artistLiaisonTelefono || null,
        driverNombre: driverNombre || null,
        driverTelefono: driverTelefono || null,
        runningOrder: runningOrder || null,
        notas: notas || null,
        estado,
        bufferPrepMin: parseInt(bufferPrepMin, 10) || 30,
        rutaIdaGeojson,
        rutaVueltaGeojson,
        artistId,
      };
      const result = hoja ? await updateHoja(hoja.id, body) : await createHoja(body);
      router.replace(`/tourmanager/${result.hoja.id}`);
    } catch {
      setError("No se pudo guardar. Revisá los datos e intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{hoja ? "Editar hoja de ruta" : "Nueva hoja de ruta"}</Text>
      <Text style={styles.subtitle}>Cargá solo lo esencial — el resto se calcula solo.</Text>

      <Field label="Artista">
        <ArtistPicker value={artistName} onChange={setArtistName} onSelect={(a: ArtistResult | null) => setArtistId(a?.id ?? null)} />
      </Field>
      <Field label="Fecha (AAAA-MM-DD)">
        <TextInput value={fecha} onChangeText={setFecha} placeholder="2026-08-20" placeholderTextColor={theme.text3} style={styles.input} />
      </Field>
      <Field label="Horario del show (HH:MM)">
        <TextInput value={horaShow} onChangeText={setHoraShow} placeholder="21:30" placeholderTextColor={theme.text3} style={styles.input} />
      </Field>
      <Field label="Tipo de evento">
        <ChipRow options={TIPOS_EVENTO} value={tipoEvento} onChange={setTipoEvento} />
      </Field>
      <Field label="Venue">
        <TextInput value={venue} onChangeText={setVenue} placeholderTextColor={theme.text3} style={styles.input} />
      </Field>
      <Field label="Dirección del venue (o link de Google Maps)">
        <TextInput
          value={venueDireccion}
          onChangeText={setVenueDireccion}
          onBlur={() => handleResolveAddress("venue", venueDireccion)}
          placeholder="Dirección o link de Maps"
          placeholderTextColor={theme.text3}
          style={styles.input}
        />
        {venueResolving && <Text style={styles.hint}>Resolviendo dirección...</Text>}
        {!venueResolving && venueFullAddress ? (
          <Text style={styles.hintGood}>
            ✓ {venueFullAddress}
            {venueCiudad ? ` — ${venueCiudad}` : ""}
            {venueProvincia ? `, ${venueProvincia}` : ""}
          </Text>
        ) : null}
      </Field>
      <Field label="Origen">
        <ChipRow options={ORIGEN_LABELS} value={origenLabel} onChange={setOrigenLabel} />
      </Field>
      <Field label="Dirección de salida (o link de Google Maps)">
        <TextInput
          value={origenDireccion}
          onChangeText={setOrigenDireccion}
          onBlur={() => handleResolveAddress("origen", origenDireccion)}
          placeholder="Dirección o link de Maps"
          placeholderTextColor={theme.text3}
          style={styles.input}
        />
        {origenResolving && <Text style={styles.hint}>Resolviendo dirección...</Text>}
        {!origenResolving && origenFullAddress ? <Text style={styles.hintGood}>✓ {origenFullAddress}</Text> : null}
      </Field>

      {venueLat != null && origenLat != null && (
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleLabel}>Cronograma calculado</Text>
          {calculatingRoute ? (
            <ActivityIndicator color={theme.accentColor} style={{ alignSelf: "flex-start" }} />
          ) : routeMsg ? (
            <Text style={styles.hint}>{routeMsg}</Text>
          ) : (
            <>
              {duracionIdaMin ? (
                <Text style={styles.scheduleRow}>
                  Tiempo de viaje: <Text style={styles.scheduleStrong}>{duracionIdaMin} min</Text>
                  {distanciaIdaKm ? ` (${distanciaIdaKm} km)` : ""}
                </Text>
              ) : null}
              {horaLlegadaVenue ? (
                <Text style={styles.scheduleRow}>
                  Llegada al venue: <Text style={styles.scheduleStrong}>{horaLlegadaVenue}</Text>
                </Text>
              ) : null}
              {horaSalida ? <Text style={styles.scheduleHighlight}>Salida recomendada: {horaSalida}</Text> : null}
            </>
          )}
        </View>
      )}

      <View style={styles.collapsibles}>
        <Collapsible title="Venue">
          <Field label="Contacto del venue">
            <TextInput value={venueContactoNombre} onChangeText={setVenueContactoNombre} placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Tel. contacto venue">
            <TextInput value={venueContactoTelefono} onChangeText={setVenueContactoTelefono} keyboardType="phone-pad" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Duración del show (min)">
            <TextInput value={duracionShowMin} onChangeText={setDuracionShowMin} keyboardType="number-pad" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
        </Collapsible>

        <Collapsible title="Cronograma de traslados">
          <Field label="Tiempo de anticipación">
            <ChipRow options={BUFFER_PRESETS.map(String)} value={bufferPrepMin} onChange={(v) => setBufferPrepMin(v || "30")} />
          </Field>
          <Text style={styles.hint}>El tiempo de viaje y la salida recomendada se recalculan solos — ver &quot;Cronograma calculado&quot; arriba.</Text>
          <Field label="Salida">
            <TextInput value={horaSalida} onChangeText={setHoraSalida} placeholder="HH:MM" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Llegada al venue">
            <TextInput value={horaLlegadaVenue} onChangeText={setHoraLlegadaVenue} placeholder="HH:MM" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Salida del venue">
            <TextInput value={horaSalidaVenue} onChangeText={setHoraSalidaVenue} placeholder="HH:MM" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Llegada a destino">
            <TextInput value={horaLlegadaDestino} onChangeText={setHoraLlegadaDestino} placeholder="HH:MM" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Pax">
            <TextInput value={pax} onChangeText={setPax} keyboardType="number-pad" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Driver">
            <TextInput value={driverNombre} onChangeText={setDriverNombre} placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Tel. driver">
            <TextInput value={driverTelefono} onChangeText={setDriverTelefono} keyboardType="phone-pad" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
        </Collapsible>

        <Collapsible title="Contactos y notas">
          <Field label="Contacto artista">
            <TextInput value={contactoArtistaNombre} onChangeText={setContactoArtistaNombre} placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Tel. contacto artista">
            <TextInput value={contactoArtistaTelefono} onChangeText={setContactoArtistaTelefono} keyboardType="phone-pad" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Artist Liaison">
            <TextInput value={artistLiaisonNombre} onChangeText={setArtistLiaisonNombre} placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Tel. Artist Liaison">
            <TextInput value={artistLiaisonTelefono} onChangeText={setArtistLiaisonTelefono} keyboardType="phone-pad" placeholderTextColor={theme.text3} style={styles.input} />
          </Field>
          <Field label="Running Order">
            <TextInput value={runningOrder} onChangeText={setRunningOrder} multiline numberOfLines={2} placeholder="Ej: Sofi B: 03.30" placeholderTextColor={theme.text3} style={[styles.input, styles.textarea]} />
          </Field>
          <Field label="Notas">
            <TextInput value={notas} onChangeText={setNotas} multiline numberOfLines={3} placeholderTextColor={theme.text3} style={[styles.input, styles.textarea]} />
          </Field>
          <Field label="Estado">
            <ChipRow options={["Borrador", "Confirmado"]} value={estado} onChange={(v) => setEstado(v || "Borrador")} />
          </Field>
        </Collapsible>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg0 },
  content: { padding: theme.space.xl, paddingBottom: theme.space["3xl"] },
  title: { color: theme.text1, ...theme.type.h1 },
  subtitle: { color: theme.text3, ...theme.type.small, marginBottom: theme.space.lg },
  label: { color: theme.text2, ...theme.type.small, marginBottom: theme.space.xs },
  input: {
    backgroundColor: theme.bg2,
    borderWidth: 1,
    borderColor: theme.lineSoft,
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    color: theme.text1,
    fontSize: 15,
  },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  hint: { color: theme.text3, ...theme.type.caption, marginTop: theme.space.xs },
  hintGood: { color: theme.accentColor, ...theme.type.caption, marginTop: theme.space.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm },
  chip: { borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusPill, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm, backgroundColor: theme.bg2 },
  chipActive: { backgroundColor: theme.accentColor, borderColor: theme.accentColor },
  chipText: { color: theme.text2, ...theme.type.small },
  chipTextActive: { color: "#000", fontWeight: "700" },
  scheduleCard: { backgroundColor: theme.bg1, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, padding: theme.space.lg, marginBottom: theme.space.lg, gap: theme.space.xs },
  scheduleLabel: { color: theme.text3, ...theme.type.label, marginBottom: theme.space.xs },
  scheduleRow: { color: theme.text2, ...theme.type.small },
  scheduleStrong: { color: theme.text1, fontWeight: "700" },
  scheduleHighlight: { color: theme.accentColor, fontSize: 15, fontWeight: "700", marginTop: theme.space.xs },
  collapsibles: { gap: theme.space.sm, marginBottom: theme.space.lg },
  errorBox: { backgroundColor: theme.critBg, borderRadius: theme.radiusSm, padding: theme.space.md, marginBottom: theme.space.md },
  errorText: { color: theme.critInk, ...theme.type.small },
  actions: { flexDirection: "row", gap: theme.space.sm, marginTop: theme.space.xs },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, paddingVertical: theme.space.md, alignItems: "center" },
  cancelText: { color: theme.text2, fontWeight: "600", fontSize: 14 },
  saveButton: { flex: 1, backgroundColor: theme.accentColor, borderRadius: theme.radiusSm, paddingVertical: theme.space.md, alignItems: "center" },
  saveText: { color: "#000", fontWeight: "700", fontSize: 14 },
});
