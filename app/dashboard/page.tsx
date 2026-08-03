"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { motion, useReducedMotion, animate, type Variants } from "framer-motion";
import porCompania from "@/data/por_compania.json";
import catalogo from "@/data/catalogo.json";
import { SELLOS, assignSello } from "@/lib/sellos";
import DrillDown, { Column } from "@/app/components/DrillDown";
import RankingListeners from "@/app/components/RankingListeners";
import RequireRole from "@/app/components/RequireRole";
import type { Release } from "@/lib/notion";

const COLORS = ["#3fc6d1", "#eef0f4", "#9a9da8", "#71737d", "#4d4f57", "#2f3036"];

type Track = {
  id?: string | number;
  artist: string;
  track: string;
  isrc: string;
  album: string;
  release_date: string;
  upc: string;
  type: string;
};

type ArtistEntry = {
  artist: string;
  track_count: number;
  companies: string[];
  tracks: { track: string; isrc: string; company: string }[];
};

const catalogoData = catalogo as ArtistEntry[];
const porCompaniaData = porCompania as {
  total: number;
  companies: { company: string; count: number; pct: number; tracks: Track[] }[];
};

const estadoColor: Record<string, string> = {
  Firmado: "#7fae6f",
  Contactado: "#8aa0c9",
  "NO SACAR": "#c96a5a",
  "Sin estado": "#8a7c62",
  Aprobado: "#dcdde2",
  "En negociacion": "#d99a4e",
  "Enviado a la firma": "#a894c9",
  "Enviado Whatsapp": "#a894c9",
  "Enviado Draft por Correo": "#a894c9",
  "Sin Empezar": "#6b6152",
};

function estadoBucket(estado: string[]): string {
  if (!estado || estado.length === 0) return "Sin estado";
  if (estado.includes("Firmado")) return "Firmado";
  if (estado.includes("NO SACAR")) return "NO SACAR";
  if (estado.includes("Aprobado")) return "Aprobado";
  if (estado.includes("Sin Empezar")) return "Sin Empezar";
  if (
    estado.includes("Enviado Whatsapp") ||
    estado.includes("Enviado Draft por Correo") ||
    estado.includes("Enviado a la firma")
  )
    return "Enviado";
  if (estado.includes("En negociacion")) return "En negociación";
  if (estado.includes("Contactado")) return "Contactado";
  return "Sin estado";
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

type DrillState =
  | { kind: "company"; company: string; rows: Track[] }
  | { kind: "estado"; estado: string; rows: Release[] }
  | { kind: "firmados" | "sinAudio" | "sinPortada"; rows: Release[] }
  | { kind: "artistas" }
  | null;

// Counts up from 0 on mount instead of just appearing — small touch that
// makes the headline numbers feel alive rather than static text.
function CountUp({ value, reduceMotion }: { value: number; reduceMotion: boolean }) {
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduceMotion]);
  return <>{display.toLocaleString("es-AR")}</>;
}

export default function Dashboard() {
  return (
    <RequireRole allow={["admin"]}>
      <DashboardInner />
    </RequireRole>
  );
}

function DashboardInner() {
  const [acuerdos, setAcuerdos] = useState<Release[] | null>(null);
  const [acuerdosError, setAcuerdosError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillState>(null);
  const reduceMotion = !!useReducedMotion();
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    show: (i: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : i * 0.08, ease: [0.16, 1, 0.3, 1] },
    }),
  };

  const [drawProgress, setDrawProgress] = useState(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      setDrawProgress(1);
      return;
    }
    const controls = animate(0, 1, {
      duration: 1.1,
      delay: 0.15,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDrawProgress,
    });
    return () => controls.stop();
  }, [reduceMotion]);

  useEffect(() => {
    fetch("/api/acuerdos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setAcuerdosError(d.error);
        else setAcuerdos(d.acuerdos);
      })
      .catch((e) => setAcuerdosError(String(e)));
  }, []);

  const estadoCounts = useMemo(() => {
    if (!acuerdos) return null;
    const buckets: Record<string, number> = {};
    for (const a of acuerdos) {
      const b = estadoBucket(a.estado);
      buckets[b] = (buckets[b] || 0) + 1;
    }
    return buckets;
  }, [acuerdos]);

  const artistaAcuerdoCount = useMemo(() => {
    if (!acuerdos) return new Map<string, Release[]>();
    const map = new Map<string, Release[]>();
    for (const a of acuerdos) {
      const key = norm(a.nombre);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [acuerdos]);

  const donutSegs = useMemo(() => {
    const top = porCompaniaData.companies;
    const circumference = 2 * Math.PI * 96;
    let offset = 0;
    const segs = top.map((c, i) => {
      const frac = c.count / porCompaniaData.total;
      const len = frac * circumference;
      const seg = { color: COLORS[i % COLORS.length], len, offset, company: c.company, count: c.count, pct: c.pct };
      offset += len;
      return seg;
    });
    return { segs, circumference, rest: circumference - offset };
  }, []);

  const maxEstado = estadoCounts ? Math.max(1, ...Object.values(estadoCounts)) : 1;
  const estadoOrder = [
    "Firmado",
    "Contactado",
    "NO SACAR",
    "Sin estado",
    "Aprobado",
    "En negociación",
    "Enviado",
    "Sin Empezar",
  ];

  const firmados = acuerdos?.filter((a) => a.estado.includes("Firmado")) ?? [];
  const sinAudio = acuerdos?.filter((a) => !a.audio) ?? [];
  const sinPortada = acuerdos?.filter((a) => !a.portada) ?? [];

  function openCompany(company: string) {
    const c = porCompaniaData.companies.find((x) => x.company === company);
    if (c) setDrill({ kind: "company", company, rows: c.tracks });
  }

  function openEstado(estado: string) {
    if (!acuerdos) return;
    const rows = acuerdos.filter((a) => estadoBucket(a.estado) === estado);
    setDrill({ kind: "estado", estado, rows });
  }

  const acuerdoColumns: Column<Release>[] = [
    { key: "nombre", label: "Artista / acuerdo" },
    { key: "compania", label: "Distribuidora" },
    { key: "estado", label: "Estado", render: (r) => r.estado.join(", ") || "—" },
    { key: "responsable", label: "Responsable" },
    { key: "audio", label: "Audio", render: (r) => (r.audio ? "✓" : "✗") },
    { key: "portada", label: "Portada", render: (r) => (r.portada ? "✓" : "✗") },
    { key: "comentario", label: "Observaciones" },
  ];

  const trackColumns: Column<Track>[] = [
    { key: "artist", label: "Artista" },
    { key: "track", label: "Fonograma" },
    { key: "album", label: "Álbum" },
    { key: "isrc", label: "ISRC" },
    { key: "release_date", label: "Fecha" },
  ];

  const artistColumns: Column<ArtistEntry & { acuerdosVinculados: number; sello: string }>[] = [
    { key: "artist", label: "Artista" },
    { key: "track_count", label: "Fonogramas" },
    { key: "companies", label: "Distribuidora", render: (r) => r.companies.join(", ") || "—" },
    { key: "sello", label: "Sello" },
    { key: "acuerdosVinculados", label: "Acuerdos vinculados" },
  ];

  const artistRows = useMemo(
    () =>
      catalogoData.map((a) => ({
        ...a,
        id: a.artist,
        acuerdosVinculados: artistaAcuerdoCount.get(norm(a.artist))?.length ?? 0,
        sello: assignSello(a.artist) ?? "Sin asignar",
      })),
    [artistaAcuerdoCount]
  );

  return (
    <div className="dash-root bg-atmosphere">
      <style>{`
        .dash-root {
          font-family: var(--font-display);
          color:var(--text-1);
          min-height:100vh;
          padding-bottom:5rem;
        }
        .dash-inner{max-width:1220px;margin:0 auto;padding:2.5rem 2rem 0;}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2.25rem;flex-wrap:wrap;gap:1rem;}
        .brand{display:flex;align-items:center;gap:10px;}
        .brand-mark{width:30px;height:30px;border-radius:9px;background:var(--accent-gradient);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--accent-ink);}
        .brand-name{font-size:14px;font-weight:600;letter-spacing:-.01em;}
        .brand-sub{font-size:11px;color:var(--text-3);}
        .nav-pills{display:flex;gap:4px;flex-wrap:wrap;background:var(--glass-bg);border:1px solid var(--glass-border);backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);border-radius:var(--radius-pill);padding:5px;}
        .nav-pill{font-size:12.5px;padding:7px 13px;border-radius:var(--radius-pill);color:var(--text-2);border:1px solid transparent;text-decoration:none;transition:background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);}
        .nav-pill.active{background:var(--accent-glass-bg);border-color:var(--accent-glass-border);color:var(--text-1);font-weight:600;}
        .nav-pill:hover:not(.active){background:var(--glass-bg-strong);color:var(--text-1);}
        .page-title{font-size:42px;font-weight:700;letter-spacing:-.03em;margin:0;background:linear-gradient(180deg,var(--text-1) 30%,var(--text-2) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
        .page-subtitle{font-size:14.5px;color:var(--text-3);margin-top:6px;}
        .sello-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:1.5rem;}
        .sello-btn{aspect-ratio:1.4;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12.5px;font-weight:600;border:1px solid var(--glass-border);border-radius:var(--radius-md);background:var(--glass-bg);color:var(--text-1);cursor:pointer;padding:.5rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);transition:transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);}
        .sello-btn:hover{background:var(--glass-bg-strong);border-color:var(--accent-color-glow);transform:translateY(-2px);}
        .card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-xl);padding:1.75rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
        .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
        .bento{display:grid;grid-template-columns:repeat(6,1fr);gap:1.1rem;margin-bottom:1.25rem;}
        .bento-donut{grid-column:span 3;grid-row:span 2;}
        .bento-estado{grid-column:span 3;grid-row:span 2;}
        .bento-kpi-firmados{grid-column:span 4;}
        .bento-kpi-artistas{grid-column:span 2;}
        .bento-kpi-sm{grid-column:span 3;}
        @media (max-width:860px){ .bento{grid-template-columns:1fr;} .bento-donut,.bento-estado,.bento-kpi-firmados,.bento-kpi-artistas,.bento-kpi-sm{grid-column:span 1;grid-row:auto;} }
        .donut-card{display:flex;flex-direction:column;height:100%;}
        .donut-wrap{display:flex;align-items:center;gap:2rem;flex-wrap:wrap;margin-top:1rem;flex:1;}
        .donut-seg{cursor:pointer;transition:filter var(--dur-fast) var(--ease-out);}
        .donut-seg:hover{filter:drop-shadow(0 0 10px rgba(255,255,255,0.4));}
        .donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;}
        .donut-center .n{font-size:52px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums;}
        .donut-center .l{font-size:12px;color:var(--text-3);margin-top:2px;}
        .donut-legend{display:flex;flex-direction:column;gap:6px;flex:1;min-width:180px;}
        .leg-row{display:flex;align-items:center;gap:10px;font-size:13px;background:transparent;border:none;padding:5px 6px;border-radius:8px;cursor:pointer;text-align:left;color:inherit;font:inherit;width:100%;transition:background var(--dur-fast) var(--ease-out);}
        .leg-row:hover{background:var(--bg-2);}
        .leg-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
        .leg-name{color:var(--text-2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .leg-val{font-variant-numeric:tabular-nums;font-weight:600;color:var(--text-1);}
        .estado-bars{display:flex;flex-direction:column;gap:10px;margin-top:1.25rem;}
        .ebar-row{display:grid;grid-template-columns:120px 1fr 40px;align-items:center;gap:10px;background:transparent;border:none;padding:4px 4px;border-radius:8px;cursor:pointer;text-align:left;color:inherit;font:inherit;}
        .ebar-row:hover{background:var(--bg-2);}
        .ebar-name{font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ebar-track{height:18px;background:var(--bg-2);border-radius:6px;overflow:hidden;}
        .ebar-fill{height:100%;border-radius:6px;transition:width var(--dur-slow) var(--ease-out);}
        .ebar-val{font-size:12px;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-1);font-weight:600;}
        .kpi{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-xl);padding:1.5rem;cursor:pointer;text-align:left;color:inherit;font:inherit;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);transition:transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);display:flex;flex-direction:column;}
        .kpi:hover{border-color:var(--accent-color-glow);background:var(--glass-bg-strong);transform:translateY(-3px);box-shadow:var(--shadow-glass), 0 0 24px -8px var(--accent-color-glow);}
        .kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;}
        .kpi-label{font-size:12.5px;color:var(--text-3);}
        .kpi-chip{font-size:11px;padding:3px 8px;border-radius:100px;font-weight:600;}
        .kpi-chip.good{background:var(--good-bg);color:var(--good-ink);}
        .kpi-chip.warn{background:var(--warn-bg);color:var(--warn-ink);}
        .kpi-chip.crit{background:var(--crit-bg);color:var(--crit-ink);}
        .kpi-num{font-size:42px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:auto;}
        .kpi-num-xl{font-size:72px;background:var(--accent-gradient);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
        .kpi-sub{font-size:12.5px;color:var(--text-3);margin-top:6px;}
        .footer-note{font-size:12px;color:var(--text-3);text-align:center;margin-top:2.5rem;}
      `}</style>

      <div className="dash-inner">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">V</div>
            <div>
              <div className="brand-name">VPO Corp</div>
              <div className="brand-sub">Centro de control</div>
            </div>
          </div>
          <div className="nav-pills">
            <span className="nav-pill active">Dashboard</span>
            <Link href="/streamings/La%20Juntada%20de%20los%20Artistas" className="nav-pill">Acuerdos</Link>
            <Link href="/catalogo" className="nav-pill">Catálogo</Link>
            <Link href="/nuevo" className="nav-pill">+ Nuevo acuerdo</Link>
            <Link href="/pm" className="nav-pill">Project Managers</Link>
            <Link href="/admin/usuarios" className="nav-pill">Usuarios</Link>
            <button
              type="button"
              className="nav-pill"
              style={{ cursor: "pointer" }}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" style={{ marginBottom: "2rem" }}>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Pulso general de sellos, acuerdos y catálogo.</p>
        </motion.div>

        <motion.div className="sello-row" variants={fadeUp} custom={1} initial="hidden" animate="show">
          {SELLOS.filter((s) => s !== "Streamings").map((s) => (
            <Link key={s} href={`/sellos/${encodeURIComponent(s)}`} className="sello-btn">
              {s}
            </Link>
          ))}
          <Link href="/catalogo-distribuido" className="sello-btn" style={{ borderStyle: "dashed" }}>
            Catálogo Distribuido
          </Link>
          <Link href="/streamings" className="sello-btn">
            Streamings
          </Link>
        </motion.div>

        {acuerdosError && (
          <div
            style={{
              background: "var(--crit-bg)",
              color: "var(--crit-ink)",
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            No se pudo conectar con Notion: {acuerdosError}
          </div>
        )}

        <motion.div className="bento" variants={fadeUp} custom={2} initial="hidden" animate="show">
          <div className="card bento-donut donut-card">
            <div className="card-label">Distribución por discográfica</div>
            <div className="donut-wrap">
              <div style={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
                <svg width="200" height="200" viewBox="0 0 224 224">
                  <circle cx="112" cy="112" r="96" fill="none" stroke="var(--bg-2)" strokeWidth="26" />
                  {donutSegs.segs.map((s) => (
                    <circle
                      key={s.company}
                      className="donut-seg"
                      cx="112"
                      cy="112"
                      r="96"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="26"
                      strokeDasharray={`${s.len * drawProgress} ${donutSegs.circumference}`}
                      strokeDashoffset={-s.offset}
                      strokeLinecap="round"
                      transform="rotate(-90 112 112)"
                      onClick={() => openCompany(s.company)}
                    >
                      <title>{`${s.company}: ${s.count} (${s.pct}%)`}</title>
                    </circle>
                  ))}
                </svg>
                <div className="donut-center">
                  <div className="n">
                    <CountUp value={porCompaniaData.total} reduceMotion={reduceMotion} />
                  </div>
                  <div className="l">fonogramas</div>
                </div>
              </div>
              <div className="donut-legend">
                {donutSegs.segs.map((s) => (
                  <button className="leg-row" key={s.company} onClick={() => openCompany(s.company)}>
                    <span className="leg-dot" style={{ background: s.color }} />
                    <span className="leg-name">{s.company}</span>
                    <span className="leg-val">
                      {s.count} · {s.pct}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card bento-estado">
            <div className="card-label">Estado de los acuerdos</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
              {acuerdos ? `${acuerdos.length} acuerdos activos` : "Cargando..."}
            </div>
            <div className="estado-bars">
              {estadoOrder.map((label) => {
                const count = estadoCounts?.[label] ?? 0;
                return (
                  <button className="ebar-row" key={label} onClick={() => openEstado(label)}>
                    <span className="ebar-name">{label}</span>
                    <div className="ebar-track">
                      <div
                        className="ebar-fill"
                        style={{
                          width: `${(count / maxEstado) * 100}%`,
                          background: estadoColor[label] || "var(--accent)",
                        }}
                      />
                    </div>
                    <span className="ebar-val">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button className="kpi bento-kpi-firmados" onClick={() => setDrill({ kind: "firmados", rows: firmados })}>
            <div className="kpi-top">
              <span className="kpi-label">Firmados</span>
              <span className="kpi-chip good">
                {acuerdos ? Math.round((firmados.length / acuerdos.length) * 100) : 0}%
              </span>
            </div>
            <div className="kpi-num kpi-num-xl">
              <CountUp value={firmados.length} reduceMotion={reduceMotion} />
            </div>
            <div className="kpi-sub">de {acuerdos?.length ?? "—"} acuerdos</div>
          </button>

          <button className="kpi bento-kpi-artistas" onClick={() => setDrill({ kind: "artistas" })}>
            <div className="kpi-top">
              <span className="kpi-label">Artistas en catálogo</span>
            </div>
            <div className="kpi-num">
              <CountUp value={catalogoData.length} reduceMotion={reduceMotion} />
            </div>
            <div className="kpi-sub">con fonogramas cargados</div>
          </button>

          <button className="kpi bento-kpi-sm" onClick={() => setDrill({ kind: "sinAudio", rows: sinAudio })}>
            <div className="kpi-top">
              <span className="kpi-label">Sin audio</span>
              <span className="kpi-chip crit">Atención</span>
            </div>
            <div className="kpi-num">
              <CountUp value={sinAudio.length} reduceMotion={reduceMotion} />
            </div>
            <div className="kpi-sub">bloquean el release</div>
          </button>
          <button className="kpi bento-kpi-sm" onClick={() => setDrill({ kind: "sinPortada", rows: sinPortada })}>
            <div className="kpi-top">
              <span className="kpi-label">Sin portada</span>
              <span className="kpi-chip warn">Revisar</span>
            </div>
            <div className="kpi-num">
              <CountUp value={sinPortada.length} reduceMotion={reduceMotion} />
            </div>
            <div className="kpi-sub">bloquean el release</div>
          </button>
        </motion.div>

        <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show">
          <RankingListeners />
        </motion.div>

        <p className="footer-note">
          Estados y acuerdos en vivo desde Notion · Catálogo de fonogramas actualizado desde Drive
          (no en vivo — la app no tiene credenciales de Google Drive) · Oyentes mensuales: pendiente
          de conexión con Chartmetric.
        </p>
      </div>

      {drill?.kind === "company" && (
        <DrillDown
          open
          onClose={() => setDrill(null)}
          title={drill.company}
          subtitle={`${drill.rows.length} fonogramas`}
          rows={drill.rows.map((r, i) => ({ ...r, id: r.isrc || i }))}
          columns={trackColumns}
        />
      )}
      {drill?.kind === "estado" && (
        <DrillDown
          open
          onClose={() => setDrill(null)}
          title={drill.estado}
          subtitle={`${drill.rows.length} acuerdos`}
          rows={drill.rows.map((r) => ({ ...r, id: r.id }))}
          columns={acuerdoColumns}
          urlKey="url"
        />
      )}
      {(drill?.kind === "firmados" || drill?.kind === "sinAudio" || drill?.kind === "sinPortada") && (
        <DrillDown
          open
          onClose={() => setDrill(null)}
          title={
            drill.kind === "firmados" ? "Firmados" : drill.kind === "sinAudio" ? "Sin audio" : "Sin portada"
          }
          subtitle={`${drill.rows.length} acuerdos`}
          rows={drill.rows.map((r) => ({ ...r, id: r.id }))}
          columns={acuerdoColumns}
          urlKey="url"
        />
      )}
      {drill?.kind === "artistas" && (
        <DrillDown
          open
          onClose={() => setDrill(null)}
          title="Artistas en catálogo"
          subtitle={`${artistRows.length} artistas`}
          rows={artistRows}
          columns={artistColumns}
        />
      )}
    </div>
  );
}
