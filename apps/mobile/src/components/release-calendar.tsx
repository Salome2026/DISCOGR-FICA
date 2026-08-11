import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { listPmReleases } from "@discografica/shared/api/pm";
import type { PmRelease } from "@discografica/shared/types/pm";

type ReleaseEvent = {
  key: string;
  fecha: string;
  titulo: string;
  artista: string;
  sello: string | null;
  estado: string;
};

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Read-only month grid, mirrors the web's ReleaseCalendar (readOnly mode)
// against the same /api/pm/releases data source (packages/shared's
// listPmReleases wrapper), grouped by group_id like the PM list screen.
export function ReleaseCalendar() {
  const [rows, setRows] = useState<PmRelease[] | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [dayDetail, setDayDetail] = useState<string | null>(null);

  useEffect(() => {
    listPmReleases().then((d) => setRows(d.releases ?? [])).catch(() => setRows([]));
  }, []);

  const events = useMemo<ReleaseEvent[]>(() => {
    if (!rows) return [];
    const byKey = new Map<string, PmRelease[]>();
    for (const r of rows) {
      if (!r.fecha_lanzamiento) continue;
      const k = r.group_id != null ? `g${r.group_id}` : `r${r.id}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(r);
    }
    return [...byKey.entries()].map(([key, group]) => {
      const first = group[0];
      return {
        key,
        fecha: String(first.fecha_lanzamiento).slice(0, 10),
        titulo: first.group_nombre || first.fonograma_nombre,
        artista: first.artist_name,
        sello: first.sello,
        estado: first.estado,
      };
    });
  }, [rows]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, ReleaseEvent[]>();
    for (const ev of events) {
      if (!m.has(ev.fecha)) m.set(ev.fecha, []);
      m.get(ev.fecha)!.push(ev);
    }
    return m;
  }, [events]);

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = new Date();

  function go(delta: number) {
    setCursor((c) => {
      const d = new Date(c);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }

  if (rows === null) {
    return <ActivityIndicator color="#3fc6d1" style={{ marginVertical: 20 }} />;
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{MESES[cursor.getMonth()]} {cursor.getFullYear()}</Text>
        <View style={styles.nav}>
          <Pressable onPress={() => go(-1)} style={styles.navButton}><Text style={styles.navButtonText}>‹</Text></Pressable>
          <Pressable onPress={() => setCursor(new Date())} style={styles.navButtonWide}><Text style={styles.navButtonText}>Hoy</Text></Pressable>
          <Pressable onPress={() => go(1)} style={styles.navButton}><Text style={styles.navButtonText}>›</Text></Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {DIAS.map((d) => (
          <Text key={d} style={styles.dayName}>{d}</Text>
        ))}
        {monthDays.map((d) => {
          const key = toKey(d);
          const dayEvents = eventsByDay.get(key) ?? [];
          const outside = d.getMonth() !== cursor.getMonth();
          return (
            <Pressable
              key={key}
              onPress={() => dayEvents.length > 0 && setDayDetail(key)}
              style={[styles.cell, outside && styles.cellOutside, isSameDay(d, today) && styles.cellToday]}
            >
              <Text style={[styles.cellNum, outside && styles.cellNumOutside]}>{d.getDate()}</Text>
              {dayEvents.length > 0 ? (
                <View style={styles.dotRow}>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <View key={ev.key} style={styles.dot} />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Modal visible={!!dayDetail} animationType="slide" transparent onRequestClose={() => setDayDetail(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {dayDetail ? new Date(dayDetail + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </Text>
              <Pressable onPress={() => setDayDetail(null)} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={dayDetail ? eventsByDay.get(dayDetail) ?? [] : []}
              keyExtractor={(ev) => ev.key}
              contentContainerStyle={styles.dayList}
              renderItem={({ item }) => (
                <View style={styles.dayRow}>
                  <Text style={styles.dayRowTitle}>{item.titulo}</Text>
                  <Text style={styles.dayRowMeta}>{item.artista} · {item.sello ?? "Sin sello"} · {item.estado}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  monthLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  nav: { flexDirection: "row", gap: 6 },
  navButton: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: "#2a2b30", alignItems: "center", justifyContent: "center" },
  navButtonWide: { paddingHorizontal: 10, height: 28, borderRadius: 8, borderWidth: 1, borderColor: "#2a2b30", alignItems: "center", justifyContent: "center" },
  navButtonText: { color: "#8b8e97", fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayName: { width: `${100 / 7}%`, textAlign: "center", color: "#5a5d68", fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 6, borderRadius: 8 },
  cellOutside: { opacity: 0.3 },
  cellToday: { backgroundColor: "rgba(63,198,209,0.1)", borderWidth: 1, borderColor: "#3fc6d1" },
  cellNum: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cellNumOutside: { color: "#5a5d68" },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 4 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#3fc6d1" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0c0c0e", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingTop: 12, borderWidth: 1, borderColor: "#2a2b30", borderBottomWidth: 0 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  sheetTitle: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 },
  closeButton: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#2a2b30", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#8b8e97", fontSize: 12 },
  dayList: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  dayRow: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, padding: 12, gap: 3 },
  dayRowTitle: { color: "#fff", fontSize: 13.5, fontWeight: "700" },
  dayRowMeta: { color: "#8b8e97", fontSize: 12 },
});
