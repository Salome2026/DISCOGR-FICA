"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import RequirePermission from "@/app/components/RequirePermission";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { AR_STATUSES, type ArOpportunity, type ArOpportunityComment, type ArStatus } from "@discografica/shared/types/ar";

function GhostButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "var(--accent-glass-bg)",
        border: "1px solid var(--accent-glass-border)",
        borderRadius: 8,
        padding: "7px 14px",
        color: "var(--text-1)",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ note }: { note?: string | null }) {
  return <div style={{ fontSize: 13, color: "var(--text-3)" }}>{note || "Sin generar todavía."}</div>;
}

function ArDetailContent({ id }: { id: string }) {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_ar");

  const [opportunity, setOpportunity] = useState<ArOpportunity | null | undefined>(undefined);
  const [comments, setComments] = useState<ArOpportunityComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingNarrative, setGeneratingNarrative] = useState(false);

  function load() {
    fetch(`/api/ar/${id}`)
      .then((r) => r.json())
      .then((d: { opportunity?: ArOpportunity; error?: string }) => setOpportunity(d.opportunity ?? null));
    fetch(`/api/ar/${id}/comments`)
      .then((r) => r.json())
      .then((d: { comments?: ArOpportunityComment[] }) => setComments(d.comments ?? []));
  }
  useEffect(load, [id]);

  async function handleStatusChange(status: ArStatus) {
    setSavingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/ar/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar el estado.");
      setOpportunity(data.opportunity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleGenerateNarrative() {
    setGeneratingNarrative(true);
    setError(null);
    try {
      const res = await fetch(`/api/ar/${id}/narrative`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el análisis.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setGeneratingNarrative(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/ar/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    if (res.ok) {
      setNewComment("");
      fetch(`/api/ar/${id}/comments`)
        .then((r) => r.json())
        .then((d: { comments?: ArOpportunityComment[] }) => setComments(d.comments ?? []));
    }
  }

  if (opportunity === undefined) {
    return (
      <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", color: "var(--text-3)", fontFamily: "var(--font-display)" }}>
        Cargando...
      </div>
    );
  }
  if (opportunity === null) {
    return (
      <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
        <Link href="/panel/ar" style={{ color: "var(--text-3)", fontSize: 13 }}>&larr; Volver</Link>
        <div style={{ marginTop: 20, color: "var(--text-3)" }}>Oportunidad no encontrada.</div>
      </div>
    );
  }

  return (
    <div className="bg-atmosphere" style={{ minHeight: "100vh", padding: "2.5rem 2rem", fontFamily: "var(--font-display)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href="/panel/ar" style={{ color: "var(--text-3)", fontSize: 13, textDecoration: "none" }}>&larr; Volver</Link>

        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={pill}>{opportunity.category}</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{opportunity.regionFocus === "AR" ? "Argentina" : "Exterior → Argentina"}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{opportunity.title}</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>{opportunity.subjectName}</p>
        </div>

        {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: "10px 14px", borderRadius: 10, fontSize: 13 }}>{error}</div>}

        <Section title="Estado">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AR_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={!canEdit || savingStatus}
                onClick={() => handleStatusChange(s)}
                style={{
                  ...pill,
                  cursor: canEdit ? "pointer" : "default",
                  background: s === opportunity.status ? "var(--accent-glass-bg)" : "var(--bg-2)",
                  border: s === opportunity.status ? "1px solid var(--accent-glass-border)" : "1px solid var(--line-soft)",
                  color: s === opportunity.status ? "var(--text-1)" : "var(--text-3)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        {opportunity.category === "OPORTUNIDAD DE CATÁLOGO" ? (
          <Section title="Análisis de revival de catálogo">
            {opportunity.narrative?.catalogRevival ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 4 }}>ESTRATEGIA COMERCIAL</div>
                  <div style={{ fontSize: 13.5 }}>{opportunity.narrative.catalogRevival.estrategiaComercial}</div>
                </div>
                {opportunity.narrative.catalogRevival.artistasCompatibles.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 4 }}>ARTISTAS COMPATIBLES</div>
                    {opportunity.narrative.catalogRevival.artistasCompatibles.map((a, i) => (
                      <div key={i} style={{ fontSize: 13 }}>
                        <strong>{a.name}</strong> — {a.motivo}
                      </div>
                    ))}
                  </div>
                )}
                {opportunity.narrative.catalogRevival.featuringsPosibles.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 4 }}>FEATURINGS POSIBLES</div>
                    {opportunity.narrative.catalogRevival.featuringsPosibles.map((a, i) => (
                      <div key={i} style={{ fontSize: 13 }}>
                        <strong>{a.name}</strong> — {a.motivo}
                      </div>
                    ))}
                  </div>
                )}
                {opportunity.narrative.catalogRevival.productoresSugeridos.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 4 }}>PRODUCTORES SUGERIDOS</div>
                    <div style={{ fontSize: 13 }}>{opportunity.narrative.catalogRevival.productoresSugeridos.join(", ")}</div>
                  </div>
                )}
                <div>
                  <GhostButton onClick={handleGenerateNarrative} disabled={generatingNarrative || !canEdit}>
                    {generatingNarrative ? "Generando..." : "↻ Regenerar análisis"}
                  </GhostButton>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                <Empty />
                {canEdit && (
                  <GhostButton onClick={handleGenerateNarrative} disabled={generatingNarrative}>
                    {generatingNarrative ? "Generando..." : "✦ Generar análisis con IA"}
                  </GhostButton>
                )}
              </div>
            )}
          </Section>
        ) : (
          <>
            <Section title="Qué está pasando">
              <Empty note={opportunity.narrative?.queEstaPasando} />
            </Section>
            <Section title="Por qué importa">
              <Empty note={opportunity.narrative?.porQueImporta} />
            </Section>
            <Section title="Impacto en Argentina">
              <Empty note={opportunity.narrative?.impactoArgentina} />
            </Section>
          </>
        )}
        <Section title="Datos">
          {opportunity.metrics ? (
            <pre style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(opportunity.metrics, null, 2)}</pre>
          ) : (
            <Empty note={opportunity.dataUnavailableNote} />
          )}
        </Section>
        <Section title="Compatibilidad">
          {opportunity.compatibility?.matchedArtists.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {opportunity.compatibility.matchedArtists.map((m) => (
                <div key={m.name} style={{ fontSize: 13 }}>
                  {m.name} {m.sello ? `— ${m.sello}` : ""} {m.sharedGenre ? "· mismo género" : ""}
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Section>
        {opportunity.category !== "OPORTUNIDAD DE CATÁLOGO" && (
          <Section title="Recomendación">
            <Empty note={opportunity.narrative?.recomendacion} />
          </Section>
        )}
        <Section title="Fuentes">
          {opportunity.sources.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {opportunity.sources.map((s, i) => (
                <div key={i} style={{ fontSize: 13 }}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-color)" }}>{s.label}</a>
                  ) : (
                    <span>{s.label}</span>
                  )}
                  {s.note ? <span style={{ color: "var(--text-3)" }}> — {s.note}</span> : null}
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Section>

        <Section title="Comentarios">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ fontSize: 13 }}>
                <span style={{ color: "var(--text-3)" }}>{c.authorEmail} — {new Date(c.createdAt).toLocaleString("es-AR")}</span>
                <div>{c.body}</div>
              </div>
            ))}
            {canEdit && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Agregar comentario..."
                  style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 12px", color: "var(--text-1)", fontSize: 13 }}
                />
                <button type="button" onClick={handleAddComment} style={{ background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8, padding: "8px 14px", color: "var(--text-1)", fontSize: 13, cursor: "pointer" }}>
                  Comentar
                </button>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

const pill: React.CSSProperties = {
  fontSize: 10.5,
  padding: "4px 10px",
  borderRadius: 999,
  background: "var(--accent-glass-bg)",
  border: "1px solid var(--accent-glass-border)",
  color: "var(--text-2)",
};

export default function ArDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  return (
    <RequirePermission need="ver_ar">
      <ArDetailContent id={id} />
    </RequirePermission>
  );
}
