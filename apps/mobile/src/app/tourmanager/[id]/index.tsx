import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { theme } from "@discografica/shared/theme";
import { getHoja, deleteHoja } from "@discografica/shared/api/tourManager";
import type { HojaDeRuta } from "@discografica/shared/types/tourManager";
import { Screen } from "@/components/screen";
import { Collapsible } from "@/components/collapsible";
import { openDocument } from "@/lib/pdf-viewer";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function HojaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hoja, setHoja] = useState<HojaDeRuta | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!id) return;
    setDownloadingPdf(true);
    try {
      await openDocument(`/api/tourmanager/${id}/pdf`);
    } catch {
      Alert.alert("Error", "No se pudo descargar el PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function load() {
    if (!id) return;
    getHoja(id).then((d) => setHoja(d.hoja ?? null));
  }
  useEffect(load, [id]);

  function confirmDelete() {
    Alert.alert("Borrar hoja de ruta", "¿Seguro que querés borrar esta hoja de ruta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteHoja(id);
            router.replace("/tourmanager");
          } catch {
            Alert.alert("Error", "No se pudo borrar la hoja de ruta.");
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (hoja === undefined) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.accentColor} style={{ marginTop: 60 }} />
      </View>
    );
  }
  if (hoja === null) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen onBack={() => router.back()} scroll={false}>
          <Text style={styles.empty}>Hoja de ruta no encontrada.</Text>
        </Screen>
      </View>
    );
  }

  const hasSchedule = hoja.horaSalida || hoja.horaLlegadaVenue;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title={hoja.artistName} subtitle={formatFecha(hoja.fecha)} onBack={() => router.back()}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, hoja.estado === "Confirmado" && styles.badgeConfirmado]}>
            <Text style={[styles.badgeText, hoja.estado === "Confirmado" && styles.badgeTextConfirmado]}>{hoja.estado}</Text>
          </View>
          {hoja.tipoEvento ? <Text style={styles.badgeMeta}>{hoja.tipoEvento}</Text> : null}
          {hoja.horaShow ? <Text style={styles.badgeMeta}>· {hoja.horaShow} hs</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => router.push(`/tourmanager/${hoja.id}/edit`)} style={styles.editButton}>
            <Text style={styles.editText}>Editar</Text>
          </Pressable>
          <Pressable onPress={handleDownloadPdf} disabled={downloadingPdf} style={styles.pdfButton}>
            <Text style={styles.pdfText}>{downloadingPdf ? "Generando..." : "PDF"}</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} disabled={deleting} style={styles.deleteButton}>
            <Text style={styles.deleteText}>{deleting ? "Borrando..." : "Borrar"}</Text>
          </Pressable>
        </View>

        {hasSchedule && (
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Cronograma</Text>
            {hoja.horaSalida ? (
              <Text style={styles.heroRow}>
                Salida: <Text style={styles.heroStrong}>{hoja.horaSalida}</Text>
                {hoja.origenLabel ? ` (${hoja.origenLabel})` : ""}
              </Text>
            ) : null}
            {hoja.horaLlegadaVenue ? (
              <Text style={styles.heroRow}>Llegada al venue: <Text style={styles.heroStrong}>{hoja.horaLlegadaVenue}</Text></Text>
            ) : null}
            {hoja.venue ? <Text style={styles.heroVenue}>{hoja.venue}{hoja.venueCiudad ? ` · ${hoja.venueCiudad}` : ""}</Text> : null}
          </View>
        )}

        <View style={styles.sections}>
          <Collapsible title="1 · Salida del equipo" defaultOpen>
            <Row label="Horario" value={hoja.horaSalida} />
            <Row label="Desde" value={hoja.origenLabel} />
            <Row label="Dirección" value={hoja.origenFullAddress ?? hoja.origenDireccion} />
          </Collapsible>

          {(hoja.puntoEncuentroNombre || hoja.horaEncuentroEquipo) && (
            <Collapsible title="2 · Punto de encuentro del equipo">
              <Row label="Horario" value={hoja.horaEncuentroEquipo} />
              <Row label="Lugar" value={hoja.puntoEncuentroNombre} />
              <Row label="Dirección" value={hoja.puntoEncuentroFullAddress ?? hoja.puntoEncuentroDireccion} />
            </Collapsible>
          )}

          {(hoja.horaBusquedaArtista || hoja.direccionBusquedaArtista) && (
            <Collapsible title="3 · Búsqueda del artista">
              <Row label="Horario" value={hoja.horaBusquedaArtista} />
              <Row label="Dirección" value={hoja.busquedaArtistaFullAddress ?? hoja.direccionBusquedaArtista} />
            </Collapsible>
          )}

          <Collapsible title="4 · Llegada y venue" defaultOpen>
            <Row label="Llegada a la ciudad" value={hoja.horaLlegadaCiudad} />
            <Row label="Llegada al venue" value={hoja.horaLlegadaVenue} />
            <Row label="Apertura de puertas" value={hoja.horaAperturaPuertas} />
            <Row label="Nombre" value={hoja.venue} />
            <Row label="Dirección" value={hoja.venueFullAddress ?? hoja.venueDireccion} />
            <Row label="Ciudad" value={hoja.venueCiudad} />
            <Row label="País" value={hoja.venuePais} />
            <Row label="Contacto" value={hoja.venueContactoNombre} />
            <Row label="Teléfono" value={hoja.venueContactoTelefono} />
            <Row label="Duración del show" value={hoja.duracionShowMin ? `${hoja.duracionShowMin} min` : null} />
          </Collapsible>

          {(hoja.horaPruebaSonido || hoja.lugarPruebaSonido) && (
            <Collapsible title="5 · Prueba de sonido">
              <Row label="Horario" value={hoja.horaPruebaSonido} />
              <Row label="Duración estimada" value={hoja.duracionPruebaSonidoMin ? `${hoja.duracionPruebaSonidoMin} min` : null} />
              <Row label="Lugar" value={hoja.lugarPruebaSonido || "Mismo lugar que el show"} />
              <Row label="Dirección" value={hoja.pruebaSonidoFullAddress ?? hoja.direccionPruebaSonido} />
            </Collapsible>
          )}

          {hoja.horaComida ? (
            <Collapsible title="6 · Comida">
              <Row label="Horario" value={hoja.horaComida} />
            </Collapsible>
          ) : null}

          {(hoja.hotelNombre || hoja.horaLlegadaHotel) && (
            <Collapsible title="7 · Hotel">
              <Row label="Nombre" value={hoja.hotelNombre} />
              <Row label="Dirección" value={hoja.hotelFullAddress ?? hoja.hotelDireccion} />
              <Row label="Llegada estimada" value={hoja.horaLlegadaHotel} />
              <Row label="Check-in" value={hoja.horaCheckin} />
              <Row label="Check-out" value={hoja.horaCheckout} />
            </Collapsible>
          )}

          {hoja.paradas.length > 0 && (
            <Collapsible title="Paradas intermedias">
              {hoja.paradas.map((p, i) => (
                <Row key={`${p.nombre}-${i}`} label={p.hora ?? `Parada ${i + 1}`} value={[p.nombre, p.fullAddress ?? p.direccion].filter(Boolean).join(" — ")} />
              ))}
            </Collapsible>
          )}

          <Collapsible title="8 · Regreso">
            <Row label="Salida del venue" value={hoja.horaSalidaVenue} />
            <Row label="Llegada a destino" value={hoja.horaLlegadaDestino} />
          </Collapsible>

          <Collapsible title="Traslados">
            <Row label="Pax" value={hoja.pax != null ? String(hoja.pax) : null} />
            <Row label="Driver" value={hoja.driverNombre} />
            <Row label="Tel. driver" value={hoja.driverTelefono} />
            <Row
              label="Origen → Venue"
              value={hoja.distanciaIdaKm != null || hoja.duracionIdaMin != null ? `${hoja.duracionIdaMin ?? "—"} min (${hoja.distanciaIdaKm ?? "—"} km)` : null}
            />
            <Row
              label="Venue → Origen"
              value={hoja.distanciaVueltaKm != null || hoja.duracionVueltaMin != null ? `${hoja.duracionVueltaMin ?? "—"} min (${hoja.distanciaVueltaKm ?? "—"} km)` : null}
            />
          </Collapsible>

          <Collapsible title="Contactos">
            <Row label="Contacto artista" value={hoja.contactoArtistaNombre} />
            <Row label="Tel. artista" value={hoja.contactoArtistaTelefono} />
            <Row label="Artist Liaison" value={hoja.artistLiaisonNombre} />
            <Row label="Tel. liaison" value={hoja.artistLiaisonTelefono} />
          </Collapsible>

          {hoja.runningOrder ? (
            <Collapsible title="Running Order">
              <Text style={styles.freeText}>{hoja.runningOrder}</Text>
            </Collapsible>
          ) : null}

          {hoja.notas ? (
            <Collapsible title="Notas">
              <Text style={styles.freeText}>{hoja.notas}</Text>
            </Collapsible>
          ) : null}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg0 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: theme.space.sm, paddingHorizontal: theme.space.xl, marginBottom: theme.space.lg },
  badge: { paddingHorizontal: theme.space.sm, paddingVertical: 3, borderRadius: theme.radiusPill, backgroundColor: theme.bg2 },
  badgeConfirmado: { backgroundColor: "rgba(63,198,209,0.16)" },
  badgeText: { color: theme.text2, ...theme.type.caption, fontWeight: "700" },
  badgeTextConfirmado: { color: theme.accentColor },
  badgeMeta: { color: theme.text3, ...theme.type.small },
  actions: { flexDirection: "row", gap: theme.space.sm, paddingHorizontal: theme.space.xl, marginBottom: theme.space.lg },
  editButton: { backgroundColor: theme.accentColor, borderRadius: theme.radiusSm, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  editText: { color: "#000", ...theme.type.smallStrong },
  pdfButton: { backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: theme.radiusSm, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  pdfText: { color: theme.text1, ...theme.type.smallStrong },
  deleteButton: { backgroundColor: theme.critBg, borderRadius: theme.radiusSm, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  deleteText: { color: theme.critInk, ...theme.type.smallStrong },
  heroCard: {
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.lg,
    backgroundColor: "rgba(63,198,209,0.08)",
    borderWidth: 1,
    borderColor: theme.accentColorGlow,
    borderRadius: theme.radiusLg,
    padding: theme.space.lg,
    gap: theme.space.xs,
  },
  heroLabel: { color: theme.accentColor, ...theme.type.label, marginBottom: theme.space.xs },
  heroRow: { color: theme.text2, ...theme.type.body },
  heroStrong: { color: theme.text1, fontWeight: "700" },
  heroVenue: { color: theme.text3, ...theme.type.small, marginTop: theme.space.xs },
  sections: { paddingHorizontal: theme.space.xl, gap: theme.space.sm },
  row: { flexDirection: "row", justifyContent: "space-between", gap: theme.space.md },
  rowLabel: { color: theme.text2, ...theme.type.small },
  rowValue: { color: theme.text1, ...theme.type.small, textAlign: "right", flexShrink: 1 },
  freeText: { color: theme.text1, ...theme.type.small, lineHeight: 19 },
  empty: { color: theme.text3, ...theme.type.small, textAlign: "center", marginTop: 40 },
});
