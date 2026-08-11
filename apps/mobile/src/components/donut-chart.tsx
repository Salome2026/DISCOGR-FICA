import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

export type DonutSegment = { label: string; count: number; color: string };

const RADIUS = 70;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Same stroke-dasharray/offset technique as the web dashboard's donut
// (app/dashboard/page.tsx's donutSegs) — one <Circle> per segment, each
// showing only its own slice of the ring via dasharray [len, rest].
export function DonutChart({ segments, total, onSelect }: { segments: DonutSegment[]; total: number; onSelect?: (label: string) => void }) {
  let offset = 0;
  const arcs = segments.map((s) => {
    const frac = total ? s.count / total : 0;
    const len = frac * CIRCUMFERENCE;
    const arc = { ...s, len, offset, pct: total ? Math.round((s.count / total) * 1000) / 10 : 0 };
    offset += len;
    return arc;
  });

  return (
    <View style={styles.root}>
      <View style={styles.chartWrap}>
        <Svg width={180} height={180} viewBox="0 0 180 180">
          <Circle cx={90} cy={90} r={RADIUS} stroke="#20222a" strokeWidth={STROKE} fill="none" />
          {arcs.map((a) => (
            <Circle
              key={a.label}
              cx={90}
              cy={90}
              r={RADIUS}
              stroke={a.color}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${a.len} ${CIRCUMFERENCE - a.len}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
              rotation={-90}
              origin="90, 90"
            />
          ))}
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={styles.centerValue}>{total.toLocaleString("es-AR")}</Text>
          <Text style={styles.centerSub}>canciones</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {arcs.map((a) => (
          <Pressable key={a.label} onPress={() => onSelect?.(a.label)} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: a.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{a.label}</Text>
            <Text style={styles.legendValue}>{a.count} · {a.pct}%</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center" },
  chartWrap: { alignItems: "center", justifyContent: "center" },
  centerLabel: { position: "absolute", alignItems: "center" },
  centerValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  centerSub: { color: "#5a5d68", fontSize: 10.5, marginTop: 2 },
  legend: { width: "100%", marginTop: 16, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendLabel: { color: "#fff", fontSize: 13, flex: 1 },
  legendValue: { color: "#8b8e97", fontSize: 12 },
});
