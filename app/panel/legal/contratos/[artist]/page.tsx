"use client";

import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { TIPOS_CONTRATO, type LegalContract } from "@/lib/db/legalContracts";
import { LegalShell, Badge, ContractForm } from "../../_shared";

// Mismo criterio que la grilla (app/panel/legal/contratos/page.tsx) — sin
// esto, un contrato guardado con una grafía levemente distinta del artista
// (acentos, mayúsculas) queda invisible en su propia ficha.
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function isVencido(fechaVencimiento: string | null): boolean {
  if (!fechaVencimiento) return false;
  return new Date(fechaVencimiento) < new Date(new Date().toDateString());
}

export default function ArtistFichaPage({ params }: { params: Promise<{ artist: string }> }) {
  const { artist: artistParam } = use(params);
  const artist = decodeURIComponent(artistParam);

  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title={artist} subtitle="Contratos por categoría" backHref="/panel/legal/contratos">
        <ArtistFicha artist={artist} />
      </LegalShell>
    </RequireRole>
  );
}

function ArtistFicha({ artist }: { artist: string }) {
  const [contracts, setContracts] = useState<LegalContract[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTipo, setOpenTipo] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<{ contract: LegalContract | null; tipo: string } | null>(null);

  function load() {
    fetch("/api/legal/contracts")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setContracts(d.contracts)))
      .catch((e) => setError(String(e)));
  }
  useEffect(load, []);

  const forArtist = (contracts ?? []).filter((c) => normalizeName(c.artist) === normalizeName(artist));

  function contractsFor(tipo: string): LegalContract[] {
    return forArtist
      .filter((c) => c.tipoContrato === tipo)
      .sort((a, b) => (b.fechaFirma ?? "").localeCompare(a.fechaFirma ?? ""));
  }

  return (
    <>
      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!contracts ? (
        <p className="muted">Cargando...</p>
      ) : (
        <div className="legal-home-buttons legal-ficha-buttons">
          {TIPOS_CONTRATO.map((tipo) => {
            const list = contractsFor(tipo);
            const current = list[0];
            return (
              <button key={tipo} className="legal-big-btn" onClick={() => setOpenTipo(tipo)} style={{ width: "100%" }}>
                <h2>{tipo}</h2>
                {current ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Badge label={current.estado} />
                    {current.estado === "Vigente" && isVencido(current.fechaVencimiento) && <span className="legal-warn">⚠ venció</span>}
                  </div>
                ) : (
                  <p>Sin contrato cargado</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {openTipo && (
        <CategoryModal
          artist={artist}
          tipo={openTipo}
          contracts={contractsFor(openTipo)}
          onClose={() => setOpenTipo(null)}
          onAdd={() => setFormFor({ contract: null, tipo: openTipo })}
          onEdit={(c) => setFormFor({ contract: c, tipo: openTipo })}
        />
      )}

      {formFor && (
        <ContractForm
          contract={formFor.contract}
          lockedArtist={artist}
          lockedTipo={formFor.tipo}
          onClose={() => setFormFor(null)}
          onSaved={() => {
            setFormFor(null);
            load();
          }}
        />
      )}
    </>
  );
}

function CategoryModal({
  artist,
  tipo,
  contracts,
  onClose,
  onAdd,
  onEdit,
}: {
  artist: string;
  tipo: string;
  contracts: LegalContract[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (c: LegalContract) => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", overflowY: "auto" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--glass-bg-strong)", backdropFilter: "blur(40px) saturate(1.7)", WebkitBackdropFilter: "blur(40px) saturate(1.7)", color: "var(--text-1)", borderRadius: 16, border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-glass-lg)", width: "100%", maxWidth: 560, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 14, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--legal-accent)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{tipo}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{artist}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--glass-border)", borderRadius: 8, color: "var(--text-2)", width: 30, height: 30, cursor: "pointer", fontSize: 14 }}>
            ×
          </button>
        </div>

        {contracts.length === 0 && (
          <p className="muted" style={{ padding: "1rem 0", textAlign: "center" }}>
            Todavía no hay un contrato de {tipo.toLowerCase()} cargado para este artista.
          </p>
        )}

        {contracts.map((c) => (
          <div key={c.id} style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge label={c.estado} />
                {c.estado === "Vigente" && isVencido(c.fechaVencimiento) && <span className="legal-warn">⚠ venció</span>}
              </div>
              <button className="legal-btn-ghost" onClick={() => onEdit(c)}>
                Editar
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12.5 }}>
              <MiniField label="Fecha de firma" value={c.fechaFirma ?? "—"} />
              <MiniField label="Vencimiento" value={c.fechaVencimiento ?? "—"} />
              <MiniField label="Contraparte" value={c.contraparte ?? "—"} />
              <MiniField label="Código interno" value={c.codigoInterno ?? "—"} />
              <MiniField label="Canción / proyecto" value={c.fonograma ?? "—"} />
              <MiniField label="Firmantes" value={c.firmantes ?? "—"} />
              <MiniField label="Cargado por" value={c.updatedBy ?? "—"} />
              <MiniField
                label="Última actualización"
                value={c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
              />
            </div>
            {c.docusignEnvelopeId && (
              <div style={{ fontSize: 10.5, color: "var(--legal-accent)" }}>Importado desde DocuSign</div>
            )}
            {c.notas && <div style={{ fontSize: 12, color: "var(--text-2)" }}>{c.notas}</div>}
            {c.documentoUrl ? (
              <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                <a className="legal-doc-link" href={c.documentoUrl} target="_blank" rel="noreferrer">
                  Ver documento
                </a>
                <a className="legal-doc-link" href={c.documentoUrl} download={c.documentoNombre || undefined}>
                  Descargar
                </a>
              </div>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>Sin documento cargado</span>
            )}
          </div>
        ))}

        <button className="legal-btn-primary" onClick={onAdd} style={{ alignSelf: "flex-start" }}>
          + Agregar contrato de {tipo.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div>{value}</div>
    </div>
  );
}
