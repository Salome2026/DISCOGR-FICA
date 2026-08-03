"use client";

import { useMemo, useState } from "react";
import tracksData from "@/data/tracks.json";
import { SELLO_ROSTERS, matchRosterArtist, type RosterArtist } from "@/lib/roster";
import DrillDown, { Column } from "@/app/components/DrillDown";

type Track = {
  isrc: string;
  track: string;
  album: string;
  release_date: string;
  upc: string;
  company: string;
  participants: string[];
  artist_display: string;
};

const tracks = tracksData as Track[];
const ROSTER = SELLO_ROSTERS["MAWZ Records"]!;

const COMPANY_ORDER = ["ADA", "FUGA", "ONErpm", "DashGo", "The Orchard", "SoundOn", "Sin distribuidora"];
const COMPANY_COLOR: Record<string, string> = {
  ADA: "#c9825a",
  FUGA: "#e6a94f",
  ONErpm: "#7f9bb0",
  DashGo: "#5c5140",
  "The Orchard": "#8a7c62",
  SoundOn: "#a894c9",
  "Sin distribuidora": "#544831",
};

function companyBreakdown(list: Track[]) {
  const counts = new Map<string, number>();
  for (const t of list) {
    const c = t.company || "Sin distribuidora";
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return COMPANY_ORDER.filter((c) => counts.has(c)).map((c) => ({
    company: c,
    count: counts.get(c)!,
    pct: list.length ? Math.round((counts.get(c)! / list.length) * 1000) / 10 : 0,
  }));
}

const trackColumns: Column<Track & { id: string; artistas: string }>[] = [
  { key: "track", label: "Fonograma" },
  { key: "artistas", label: "Artistas / colaboradores" },
  { key: "album", label: "Álbum" },
  { key: "company", label: "Distribuidora" },
  { key: "isrc", label: "ISRC" },
  { key: "release_date", label: "Fecha" },
];

function withRows(list: Track[]) {
  return list.map((t) => ({ ...t, id: t.isrc || t.track, artistas: t.artist_display.replace(/\|/g, ", ") }));
}

type DrillState =
  | { kind: "company"; title: string; rows: Track[] }
  | { kind: "artist"; title: string; rows: Track[] }
  | null;

export default function MawzRecordsView() {
  const [drill, setDrill] = useState<DrillState>(null);

  const { perArtist, unionTracks, breakdown } = useMemo(() => {
    const perArtist = new Map<string, Track[]>();
    for (const a of ROSTER) perArtist.set(a.id, []);
    const unionMap = new Map<string, Track>();

    for (const t of tracks) {
      const matched = new Set<RosterArtist>();
      for (const p of t.participants) {
        const m = matchRosterArtist(p, ROSTER);
        if (m) matched.add(m);
      }
      if (matched.size === 0) continue;
      for (const a of matched) perArtist.get(a.id)!.push(t);
      unionMap.set(t.isrc || t.track, t);
    }

    const unionTracks = [...unionMap.values()];
    return { perArtist, unionTracks, breakdown: companyBreakdown(unionTracks) };
  }, []);

  const circumference = 2 * Math.PI * 80;
  let offset = 0;
  const segs = breakdown.map((c) => {
    const len = unionTracks.length ? (c.count / unionTracks.length) * circumference : 0;
    const seg = { ...c, len, offset };
    offset += len;
    return seg;
  });

  return (
    <>
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Artistas</div>
          <div className="kpi-num">{ROSTER.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Fonogramas</div>
          <div className="kpi-num">{unionTracks.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Distribuidoras</div>
          <div className="kpi-num">{breakdown.length}</div>
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", width: 190, height: 190, flexShrink: 0 }}>
          <svg width="190" height="190" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="80" fill="none" stroke="var(--bg-2)" strokeWidth="22" />
            {segs.map((s) => (
              <circle
                key={s.company}
                cx="95"
                cy="95"
                r="80"
                fill="none"
                stroke={COMPANY_COLOR[s.company] ?? "#8a7c62"}
                strokeWidth="22"
                strokeDasharray={`${s.len} ${circumference}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="round"
                transform="rotate(-90 95 95)"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setDrill({
                    kind: "company",
                    title: s.company,
                    rows: unionTracks.filter((t) => (t.company || "Sin distribuidora") === s.company),
                  })
                }
              >
                <title>{`${s.company}: ${s.count} (${s.pct}%)`}</title>
              </circle>
            ))}
          </svg>
          <div className="donut-center">
            <div className="n" style={{ fontSize: 32 }}>{unionTracks.length}</div>
            <div className="l">fonogramas</div>
          </div>
        </div>
        <div className="donut-legend" style={{ flex: 1, minWidth: 220 }}>
          <div className="card-label" style={{ marginBottom: 4 }}>Distribución por discográfica</div>
          {segs.map((s) => (
            <button
              key={s.company}
              className="leg-row"
              onClick={() =>
                setDrill({
                  kind: "company",
                  title: s.company,
                  rows: unionTracks.filter((t) => (t.company || "Sin distribuidora") === s.company),
                })
              }
            >
              <span className="leg-dot" style={{ background: COMPANY_COLOR[s.company] ?? "#8a7c62" }} />
              <span className="leg-name">{s.company}</span>
              <span className="leg-val">{s.count} · {s.pct}%</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 16 }}>
        {ROSTER.map((a) => {
          const list = perArtist.get(a.id) ?? [];
          const bd = companyBreakdown(list);
          return (
            <div key={a.id} className="card">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{a.name}</div>
              <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
                <div>
                  <div className="kpi-label">Fonogramas</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{list.length}</div>
                </div>
                <div>
                  <div className="kpi-label">Distribuidoras</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{bd.length}</div>
                </div>
              </div>
              {bd.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                  {bd.map((c) => (
                    <div key={c.company} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ color: "var(--text-2)" }}>{c.company}</span>
                      <span style={{ fontWeight: 600 }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty" style={{ padding: 0, marginBottom: 14 }}>
                  Todavía no hay fonogramas cargados para este artista en la planilla.
                </p>
              )}
              <button
                type="button"
                onClick={() => setDrill({ kind: "artist", title: a.name, rows: list })}
                disabled={list.length === 0}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: list.length ? "var(--bg-2)" : "transparent",
                  color: list.length ? "var(--text-1)" : "var(--text-3)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: list.length ? "pointer" : "default",
                }}
              >
                Ver catálogo
              </button>
            </div>
          );
        })}
      </div>

      {drill && (
        <DrillDown
          open
          onClose={() => setDrill(null)}
          title={drill.title}
          subtitle={`${drill.rows.length} fonogramas`}
          rows={withRows(drill.rows)}
          columns={trackColumns}
        />
      )}
    </>
  );
}
