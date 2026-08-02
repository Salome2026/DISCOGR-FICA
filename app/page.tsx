import Link from "next/link";
import kpis from "@/data/dashboard_kpis.json";

const COLORS = ["#e6a94f", "#c9825a", "#7f9bb0", "#5c5140", "#8a7c62"];

function donutSegments() {
  const top = kpis.top_companies;
  const total = kpis.total_tracks;
  let offset = 0;
  const circumference = 2 * Math.PI * 96;
  const segs = top.map((c, i) => {
    const frac = c.count / total;
    const len = frac * circumference;
    const seg = { color: COLORS[i % COLORS.length], len, offset };
    offset += len;
    return seg;
  });
  const rest = circumference - offset;
  segs.push({ color: "#4a4131", len: rest, offset });
  return { segs, circumference };
}

export default function Dashboard() {
  const { segs, circumference } = donutSegments();
  const estados = kpis.estados;
  const maxEstado = Math.max(...estados.map((e) => e.count));

  const estadoColor: Record<string, string> = {
    Firmado: "#7fae6f",
    Contactado: "#8aa0c9",
    "NO SACAR": "#c96a5a",
    "Sin estado": "#8a7c62",
    Aprobado: "#e6a94f",
    "En negociación": "#d99a4e",
    "Enviado (WhatsApp/Correo/Firma)": "#a894c9",
    "Sin Empezar": "#6b6152",
  };

  return (
    <div className="dash-root">
      <style>{`
        .dash-root {
          --bg-0:#2a241c; --bg-0b:#3a3226; --bg-1:#332c22; --bg-2:#3d3427; --bg-3:#473c2c;
          --line:#544831; --line-soft:#403627;
          --text-1:#f4ede1; --text-2:#c2b39a; --text-3:#8f8267;
          --gold:#e6a94f; --gold-ink:#3a2b0f;
          --good:#7fae6f; --good-bg:#3a4032; --good-ink:#d3e6c9;
          --warn:#d99a4e; --warn-bg:#40331f; --warn-ink:#f0cfa0;
          --crit:#c96a5a; --crit-bg:#3d2a24; --crit-ink:#eab3a8;
          --radius-lg:20px; --radius-md:14px;
          font-family:-apple-system,"SF Pro Display",ui-sans-serif,"Segoe UI",Helvetica,Arial,sans-serif;
          background:linear-gradient(180deg,var(--bg-0) 0%,var(--bg-0b) 55%,var(--bg-0) 100%);
          color:var(--text-1);
          min-height:100vh;
          padding-bottom:5rem;
        }
        .dash-inner{max-width:1120px;margin:0 auto;padding:2.5rem 2rem 0;}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2.25rem;flex-wrap:wrap;gap:1rem;}
        .brand{display:flex;align-items:center;gap:10px;}
        .brand-mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(155deg,#e6a94f,#c98f3a);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#241a08;}
        .brand-name{font-size:14px;font-weight:600;letter-spacing:-.01em;}
        .brand-sub{font-size:11px;color:var(--text-3);}
        .nav-pills{display:flex;gap:6px;flex-wrap:wrap;}
        .nav-pill{font-size:12.5px;padding:7px 13px;border-radius:100px;color:var(--text-2);border:1px solid transparent;text-decoration:none;}
        .nav-pill.active{background:var(--bg-2);color:var(--text-1);border-color:var(--line);}
        .nav-pill:hover:not(.active){background:var(--bg-1);}
        .card{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:var(--radius-lg);padding:1.75rem;}
        .card-label{font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:500;}
        .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:1.25rem;margin-bottom:1.25rem;}
        .donut-card{display:flex;align-items:center;gap:2rem;flex-wrap:wrap;}
        .donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .donut-center .n{font-size:44px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
        .donut-center .l{font-size:12px;color:var(--text-3);margin-top:2px;}
        .donut-legend{display:flex;flex-direction:column;gap:10px;flex:1;min-width:180px;}
        .leg-row{display:flex;align-items:center;gap:10px;font-size:13px;}
        .leg-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
        .leg-name{color:var(--text-2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .leg-val{font-variant-numeric:tabular-nums;font-weight:600;color:var(--text-1);}
        .estado-bars{display:flex;flex-direction:column;gap:12px;margin-top:1rem;}
        .ebar-row{display:grid;grid-template-columns:120px 1fr 56px;align-items:center;gap:10px;}
        .ebar-name{font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ebar-track{height:18px;background:var(--bg-2);border-radius:6px;overflow:hidden;}
        .ebar-fill{height:100%;border-radius:6px;}
        .ebar-val{font-size:12px;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-1);font-weight:600;}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem;margin-bottom:1.25rem;}
        .kpi{background:var(--bg-1);border:1px solid var(--line-soft);border-radius:var(--radius-lg);padding:1.5rem;}
        .kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;}
        .kpi-label{font-size:12.5px;color:var(--text-3);}
        .kpi-chip{font-size:11px;padding:3px 8px;border-radius:100px;font-weight:600;}
        .kpi-chip.good{background:var(--good-bg);color:var(--good-ink);}
        .kpi-chip.warn{background:var(--warn-bg);color:var(--warn-ink);}
        .kpi-chip.crit{background:var(--crit-bg);color:var(--crit-ink);}
        .kpi-num{font-size:38px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
        .kpi-sub{font-size:12.5px;color:var(--text-3);margin-top:6px;}
        .footer-note{font-size:12px;color:var(--text-3);text-align:center;margin-top:2.5rem;}
        @media (max-width:860px){ .hero-grid{grid-template-columns:1fr;} .kpi-grid{grid-template-columns:repeat(2,1fr);} }
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
            <Link href="/releases" className="nav-pill">Acuerdos</Link>
            <Link href="/catalogo" className="nav-pill">Catálogo</Link>
            <Link href="/nuevo" className="nav-pill">+ Nuevo acuerdo</Link>
          </div>
        </div>

        <div className="hero-grid">
          <div className="card donut-card">
            <div style={{ position: "relative", width: 224, height: 224, flexShrink: 0 }}>
              <svg width="224" height="224" viewBox="0 0 224 224">
                <circle cx="112" cy="112" r="96" fill="none" stroke="var(--bg-2)" strokeWidth="26" />
                {segs.map((s, i) => (
                  <circle
                    key={i}
                    cx="112"
                    cy="112"
                    r="96"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="26"
                    strokeDasharray={`${s.len} ${circumference}`}
                    strokeDashoffset={-s.offset}
                    strokeLinecap="round"
                    transform="rotate(-90 112 112)"
                  />
                ))}
              </svg>
              <div className="donut-center">
                <div className="n">{kpis.total_tracks.toLocaleString("es-AR")}</div>
                <div className="l">fonogramas</div>
              </div>
            </div>
            <div className="donut-legend">
              <div className="card-label" style={{ marginBottom: 2 }}>
                Distribución por discográfica
              </div>
              {kpis.top_companies.map((c, i) => (
                <div className="leg-row" key={c.company}>
                  <span className="leg-dot" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="leg-name">{c.company}</span>
                  <span className="leg-val">
                    {c.count} · {c.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-label">Estado de los acuerdos</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
              {kpis.acuerdos_total} acuerdos activos
            </div>
            <div className="estado-bars">
              {estados.map((e) => (
                <div className="ebar-row" key={e.label}>
                  <span className="ebar-name">{e.label_short}</span>
                  <div className="ebar-track">
                    <div
                      className="ebar-fill"
                      style={{
                        width: `${(e.count / maxEstado) * 100}%`,
                        background: estadoColor[e.label] || "var(--gold)",
                      }}
                    />
                  </div>
                  <span className="ebar-val">{e.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Firmados</span>
              <span className="kpi-chip good">{kpis.firmados_pct}%</span>
            </div>
            <div className="kpi-num">{kpis.firmados}</div>
            <div className="kpi-sub">de {kpis.acuerdos_total} acuerdos</div>
          </div>
          <div className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Sin audio</span>
              <span className="kpi-chip crit">Atención</span>
            </div>
            <div className="kpi-num">{kpis.sin_audio}</div>
            <div className="kpi-sub">bloquean el release</div>
          </div>
          <div className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Sin portada</span>
              <span className="kpi-chip warn">Revisar</span>
            </div>
            <div className="kpi-num">{kpis.sin_portada}</div>
            <div className="kpi-sub">bloquean el release</div>
          </div>
          <div className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Artistas en catálogo</span>
            </div>
            <div className="kpi-num">{kpis.total_artists}</div>
            <div className="kpi-sub">con fonogramas cargados</div>
          </div>
        </div>

        <p className="footer-note">
          Diseño en construcción — datos reales de Notion y Drive. Próximo paso: drill-down por
          estado y ficha de artista.
        </p>
      </div>
    </div>
  );
}
