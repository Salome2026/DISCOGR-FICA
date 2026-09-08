"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RequirePermission from "@/app/components/RequirePermission";
import ModuleWatermark from "@/app/components/ModuleWatermark";

type CreativeProfile = {
  posicionamiento: string;
  diferenciador: string;
  fortalezas: string[];
  debilidades: string[];
  oportunidades: string[];
  identidadVisual: string;
  identidadSonora: string;
  storytelling: string;
  universoCreativo: string;
  comunidad: string;
  direccionArtisticaSugerida: string;
  referenciasNacionales: string[];
  referenciasInternacionales: string[];
  justificacion: string;
};

type OpportunityProfile = {
  sonidosSugeridos: string[];
  generosCompatibles: string[];
  tempoSugerido: string;
  productoresSugeridos: string[];
  featuringsSugeridos: { name: string; motivo: string }[];
  potencialComercial: {
    probabilidadExito: string;
    nivelDeRiesgo: string;
    inversionRecomendada: string;
    mercadosRecomendados: string[];
    justificacion: string;
  };
};

type Profile = {
  creativeProfile: CreativeProfile | null;
  opportunityProfile: OpportunityProfile | null;
  creativeGeneratedAt: string | null;
  opportunityGeneratedAt: string | null;
} | null;

type Snapshot = {
  artistName: string;
  sello: string | null;
  growth: { monthlyListeners: number | null; prev30d: number | null; followers: number | null } | null;
  catalogHistory: { track: string; releaseDate: string | null; genero: string | null }[];
  playlists: string[];
  relatedOpportunities: { id: string; category: string; title: string; status: string }[];
};

const card: React.CSSProperties = {
  background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: "18px 20px",
  display: "flex", flexDirection: "column", gap: 10,
};
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".05em" };
const primaryBtn: React.CSSProperties = {
  background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 10,
  padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
};

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((i) => (
        <span key={i} style={{ fontSize: 12, background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 999, padding: "3px 10px" }}>
          {i}
        </span>
      ))}
    </div>
  );
}

function ArtistaDetailInner() {
  const params = useParams();
  const artistName = decodeURIComponent(params.name as string);

  const [profile, setProfile] = useState<Profile>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [genCreative, setGenCreative] = useState(false);
  const [genOpportunity, setGenOpportunity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs (no state) para bloquear un segundo click antes de que React llegue
  // a re-renderizar con `disabled` — el estado es async, un ref se lee/escribe
  // en el momento.
  const creativeInFlight = useRef(false);
  const opportunityInFlight = useRef(false);

  function load() {
    setLoading(true);
    fetch(`/api/ar/artistas/${encodeURIComponent(artistName)}`)
      .then((r) => r.json())
      .then((d: { profile?: Profile; snapshot?: Snapshot }) => {
        setProfile(d.profile ?? null);
        setSnapshot(d.snapshot ?? null);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [artistName]);

  async function generateCreative() {
    if (creativeInFlight.current) return;
    creativeInFlight.current = true;
    setGenCreative(true);
    setError(null);
    try {
      const res = await fetch(`/api/ar/artistas/${encodeURIComponent(artistName)}/creative-profile`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo generar.");
      // La respuesta ya trae el perfil/snapshot frescos — evita un GET extra
      // que volvería a armar el snapshot desde cero.
      setProfile((p) => ({ ...(p ?? {}), creativeProfile: d.profile.creativeProfile, creativeGeneratedAt: d.profile.creativeGeneratedAt, opportunityProfile: p?.opportunityProfile ?? null, opportunityGeneratedAt: p?.opportunityGeneratedAt ?? null }));
      setSnapshot(d.snapshot ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setGenCreative(false);
      creativeInFlight.current = false;
    }
  }

  async function generateOpportunity() {
    if (opportunityInFlight.current) return;
    opportunityInFlight.current = true;
    setGenOpportunity(true);
    setError(null);
    try {
      const res = await fetch(`/api/ar/artistas/${encodeURIComponent(artistName)}/opportunity-profile`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo generar.");
      setProfile((p) => ({ ...(p ?? {}), opportunityProfile: d.profile.opportunityProfile, opportunityGeneratedAt: d.profile.opportunityGeneratedAt, creativeProfile: p?.creativeProfile ?? null, creativeGeneratedAt: p?.creativeGeneratedAt ?? null }));
      setSnapshot(d.snapshot ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setGenOpportunity(false);
      opportunityInFlight.current = false;
    }
  }

  const creative = profile?.creativeProfile ?? null;
  const opportunity = profile?.opportunityProfile ?? null;

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <ModuleWatermark text="A&R" />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Link href="/panel/ar/artistas" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>← Volver a artistas</Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 0" }}>{snapshot?.artistName ?? artistName}</h1>
          {snapshot?.sello && <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>{snapshot.sello}</p>}
        </div>

        {loading && <div style={{ color: "var(--text-3)", fontSize: 13 }}>Cargando...</div>}
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}

        {snapshot && (
          <div style={card}>
            <div style={sectionTitle}>Datos reales</div>
            <div style={{ fontSize: 13.5, display: "flex", flexDirection: "column", gap: 6 }}>
              <div>
                {snapshot.growth?.monthlyListeners != null
                  ? `${snapshot.growth.monthlyListeners.toLocaleString("es-AR")} oyentes mensuales${snapshot.growth.followers != null ? ` · ${snapshot.growth.followers.toLocaleString("es-AR")} seguidores` : ""}`
                  : "Sin datos de audiencia todavía"}
              </div>
              <div>
                {snapshot.catalogHistory.length
                  ? `${snapshot.catalogHistory.length} lanzamiento(s) en catálogo — último: "${snapshot.catalogHistory[0].track}"`
                  : "Sin lanzamientos propios registrados"}
              </div>
              <div>{snapshot.playlists.length ? `En ${snapshot.playlists.length} playlist(s) propia(s): ${snapshot.playlists.join(", ")}` : "Sin presencia en playlists propias todavía"}</div>
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={sectionTitle}>Identidad y branding</div>
            <button onClick={generateCreative} disabled={genCreative} style={primaryBtn}>
              {genCreative ? "Generando..." : creative ? "↻ Regenerar" : "✦ Generar análisis"}
            </button>
          </div>
          {!creative ? (
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>Sin generar todavía.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13.5, lineHeight: 1.55 }}>
              <div><strong>Posicionamiento:</strong> {creative.posicionamiento}</div>
              <div><strong>Diferenciador:</strong> {creative.diferenciador}</div>
              <div>
                <strong>Fortalezas:</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{creative.fortalezas.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
              <div>
                <strong>Debilidades:</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{creative.debilidades.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
              <div>
                <strong>Oportunidades:</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{creative.oportunidades.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
              <div><strong>Identidad visual:</strong> {creative.identidadVisual}</div>
              <div><strong>Identidad sonora:</strong> {creative.identidadSonora}</div>
              <div><strong>Storytelling:</strong> {creative.storytelling}</div>
              <div><strong>Universo creativo:</strong> {creative.universoCreativo}</div>
              <div><strong>Comunidad:</strong> {creative.comunidad}</div>
              <div><strong>Dirección artística sugerida:</strong> {creative.direccionArtisticaSugerida}</div>
              {(creative.referenciasNacionales.length > 0 || creative.referenciasInternacionales.length > 0) && (
                <div>
                  <strong>Referencias:</strong> {[...creative.referenciasNacionales, ...creative.referenciasInternacionales].join(", ")}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{creative.justificacion}</div>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={sectionTitle}>Recomendaciones</div>
            <button onClick={generateOpportunity} disabled={genOpportunity} style={primaryBtn}>
              {genOpportunity ? "Generando..." : opportunity ? "↻ Regenerar" : "✦ Generar recomendaciones"}
            </button>
          </div>
          {!opportunity ? (
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>Sin generar todavía.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13.5 }}>
              <div>
                <div style={{ marginBottom: 4 }}><strong>Sonidos sugeridos</strong></div>
                <Chips items={opportunity.sonidosSugeridos} />
              </div>
              <div>
                <div style={{ marginBottom: 4 }}><strong>Géneros compatibles</strong></div>
                <Chips items={opportunity.generosCompatibles} />
              </div>
              <div><strong>Tempo sugerido:</strong> {opportunity.tempoSugerido}</div>
              <div>
                <div style={{ marginBottom: 4 }}><strong>Productores sugeridos</strong></div>
                <Chips items={opportunity.productoresSugeridos} />
              </div>
              <div>
                <div style={{ marginBottom: 4 }}><strong>Featurings posibles</strong></div>
                {opportunity.featuringsSugeridos.length === 0 ? (
                  <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Ninguno detectado por ahora.</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {opportunity.featuringsSugeridos.map((f) => (
                      <div key={f.name} style={{ fontSize: 13 }}>
                        <Link href={`/panel/ar/artistas/${encodeURIComponent(f.name)}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                          {f.name}
                        </Link>
                        {" — "}{f.motivo}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  background: "var(--bg-2)", borderRadius: 10, padding: "12px 14px", display: "flex",
                  flexDirection: "column", gap: 6, fontSize: 13,
                }}
              >
                <div style={sectionTitle}>Potencial comercial</div>
                <div><strong>Probabilidad de éxito:</strong> {opportunity.potencialComercial.probabilidadExito}</div>
                <div><strong>Nivel de riesgo:</strong> {opportunity.potencialComercial.nivelDeRiesgo}</div>
                <div><strong>Inversión recomendada:</strong> {opportunity.potencialComercial.inversionRecomendada}</div>
                <div><strong>Mercados recomendados:</strong> {opportunity.potencialComercial.mercadosRecomendados.join(", ") || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{opportunity.potencialComercial.justificacion}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ArArtistaDetailPage() {
  return (
    <RequirePermission need="ver_ar">
      <ArtistaDetailInner />
    </RequirePermission>
  );
}
