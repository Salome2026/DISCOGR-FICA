"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CmAvatar, CM_MATERIALES_LABELS } from "../_shared";
import { MATERIAL_NEEDS_FIELDS, emptyMaterialNeeds, CM_REQUEST_TIPO_LABELS, type MaterialNeeds, type CmRequestTipo } from "@/lib/cmMaterialRequestConstants";

type PmArtist = {
  artistId: string; artistName: string; photoUrl: string | null; role: "owner" | "collaborator";
  materialesEstado: string | null; fechaLanzamiento: string | null;
  launchId: string | null; responsiblePms: string[];
};
type Pm = { email: string; name: string; artists: PmArtist[] };

type MaterialRequest = {
  id: string; artistId: string; artistName: string; targetPms: string[]; requestedBy: string;
  needs: MaterialNeeds; infoAdicional: string | null; tipo: CmRequestTipo; status: "Pendiente" | "Resuelto";
  pmResponse: string | null; respondedBy: string | null; respondedAt: string | null; createdAt: string;
};

function formatDate(v: string): string {
  return new Date(v).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function RequestModal({
  artist, pmEmails, initialTipo, onClose, onSent,
}: {
  artist: { artistId: string; artistName: string; launchId: string | null };
  pmEmails: string[];
  initialTipo: CmRequestTipo;
  onClose: () => void;
  onSent: () => void;
}) {
  const [tipo, setTipo] = useState<CmRequestTipo>(initialTipo);
  const [needs, setNeeds] = useState<MaterialNeeds>(emptyMaterialNeeds());
  const [infoAdicional, setInfoAdicional] = useState("");
  const [selectedPms, setSelectedPms] = useState<string[]>(pmEmails);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePm(email: string) {
    setSelectedPms((prev) => (prev.includes(email) ? prev.filter((p) => p !== email) : [...prev, email]));
  }

  async function handleSubmit() {
    if (selectedPms.length === 0) {
      setError("Elegí a quién dirigir el pedido.");
      return;
    }
    if (tipo !== "material" && !infoAdicional.trim()) {
      setError("Contá qué pasó o qué observás.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cm/pms/${artist.artistId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId: artist.launchId,
          targetPms: selectedPms,
          needs: tipo === "material" ? needs : emptyMaterialNeeds(),
          infoAdicional: infoAdicional.trim() || null,
          tipo,
          artistName: artist.artistName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el pedido.");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="cm-card" onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{artist.artistName}</div>

        <div style={{ display: "flex", gap: 6 }}>
          {(["material", "link_incorrecto", "observacion"] as CmRequestTipo[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`cm-badge ${tipo === t ? "ok" : ""}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              {CM_REQUEST_TIPO_LABELS[t]}
            </button>
          ))}
        </div>

        {tipo === "material" && (
          <div>
            <label className="cm-label">¿Qué necesitás?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
              {MATERIAL_NEEDS_FIELDS.map((f) => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={needs[f.key]}
                    onChange={(e) => setNeeds((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="cm-label">
            {tipo === "material" ? "Información adicional (opcional)" : tipo === "link_incorrecto" ? "¿Qué link está mal? / qué debería ser" : "Observación"}
          </label>
          <textarea
            className="cm-input"
            style={{ minHeight: 90, resize: "vertical" }}
            value={infoAdicional}
            onChange={(e) => setInfoAdicional(e.target.value)}
          />
        </div>

        <div>
          <label className="cm-label">Dirigir a</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
            {pmEmails.map((email) => (
              <label key={email} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={selectedPms.includes(email)} onChange={() => togglePm(email)} />
                {email}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="cm-badge crit">{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="cm-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="cm-btn" disabled={sending} onClick={handleSubmit}>
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtistHistory({ artistId }: { artistId: string }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[] | null>(null);

  function load() {
    fetch(`/api/cm/pms/${artistId}/requests`)
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []));
  }

  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !requests) load();
        }}
        style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 11.5, cursor: "pointer", textDecoration: "underline", padding: 0 }}
      >
        {open ? "Ocultar historial" : "Ver historial"}
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          {requests === null && <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>Cargando...</span>}
          {requests?.length === 0 && <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>Sin pedidos todavía.</span>}
          {requests?.map((r) => (
            <div key={r.id} style={{ fontSize: 11.5, borderTop: "1px solid var(--line-soft)", paddingTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{CM_REQUEST_TIPO_LABELS[r.tipo]}</span>
                <span className={`cm-badge ${r.status === "Resuelto" ? "ok" : "warn"}`} style={{ fontSize: 10 }}>{r.status}</span>
              </div>
              <div style={{ color: "var(--text-3)" }}>{formatDate(r.createdAt)} · a {r.targetPms.join(", ")}</div>
              {r.infoAdicional && <div style={{ marginTop: 2 }}>{r.infoAdicional}</div>}
              {r.pmResponse && <div style={{ marginTop: 2, color: "var(--good-ink)" }}>Respuesta: {r.pmResponse}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CmPmsInner() {
  const [pms, setPms] = useState<Pm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPm, setFilterPm] = useState("");
  const [filterArtist, setFilterArtist] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [requestModal, setRequestModal] = useState<{ artistId: string; artistName: string; launchId: string | null; pmEmails: string[]; tipo: CmRequestTipo } | null>(null);
  const [sentNotice, setSentNotice] = useState(false);

  useEffect(() => {
    fetch("/api/cm/pms").then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setPms(d.pms)));
  }, []);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const pm of pms ?? []) for (const a of pm.artists) set.add(a.artistName);
    return [...set].sort();
  }, [pms]);

  const filteredPms = useMemo(() => {
    if (!pms) return [];
    return pms
      .filter((pm) => !filterPm || pm.email === filterPm)
      .map((pm) => ({
        ...pm,
        artists: pm.artists.filter((a) =>
          (!filterArtist || a.artistName === filterArtist) &&
          (!onlyPending || (a.materialesEstado && a.materialesEstado !== "assets_disponibles"))
        ),
      }))
      .filter((pm) => pm.artists.length > 0);
  }, [pms, filterPm, filterArtist, onlyPending]);

  return (
    <CmShell title="Project Managers responsables" subtitle="A quién reclamarle assets, información o correcciones de cada lanzamiento" active="pms">
      {error && <div className="cm-badge crit" style={{ marginBottom: 16 }}>{error}</div>}
      {sentNotice && (
        <div className="cm-badge ok" style={{ marginBottom: 16 }}>
          ✓ Pedido enviado. {" "}
          <button type="button" onClick={() => setSentNotice(false)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline" }}>
            Cerrar
          </button>
        </div>
      )}

      <div className="cm-filter-row">
        <select value={filterPm} onChange={(e) => setFilterPm(e.target.value)}>
          <option value="">Todos los PM</option>
          {(pms ?? []).map((pm) => <option key={pm.email} value={pm.email}>{pm.name}</option>)}
        </select>
        <select value={filterArtist} onChange={(e) => setFilterArtist(e.target.value)}>
          <option value="">Todos los artistas / unidades</option>
          {artistOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Solo assets pendientes
        </label>
      </div>

      {pms === null ? (
        <p className="cm-empty">Cargando...</p>
      ) : filteredPms.length === 0 ? (
        <p className="cm-empty">No hay resultados con estos filtros.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredPms.map((pm) => (
            <div key={pm.email} className="cm-section" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <CmAvatar name={pm.name} photoUrl={null} size={32} />
                <div style={{ fontWeight: 700, fontSize: 15 }}>{pm.name}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{pm.email}</div>
              </div>
              <div className="cm-grid">
                {pm.artists.map((a) => (
                  <div key={`${pm.email}-${a.artistId}`} className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CmAvatar name={a.artistName} photoUrl={a.photoUrl} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.artistName}</div>
                          {a.role === "collaborator" && <span className="cm-badge">Compartido</span>}
                        </div>
                        {a.materialesEstado ? (
                          <span className={`cm-badge ${a.materialesEstado === "assets_disponibles" ? "ok" : "warn"}`}>
                            {CM_MATERIALES_LABELS[a.materialesEstado] ?? a.materialesEstado}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Sin lanzamiento reciente</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <button
                        type="button"
                        className="cm-btn-ghost"
                        style={{ fontSize: 11.5, padding: "4px 8px" }}
                        onClick={() => setRequestModal({ artistId: a.artistId, artistName: a.artistName, launchId: a.launchId, pmEmails: a.responsiblePms, tipo: "material" })}
                      >
                        Solicitar material
                      </button>
                      <button
                        type="button"
                        className="cm-btn-ghost"
                        style={{ fontSize: 11.5, padding: "4px 8px" }}
                        onClick={() => setRequestModal({ artistId: a.artistId, artistName: a.artistName, launchId: a.launchId, pmEmails: a.responsiblePms, tipo: "link_incorrecto" })}
                      >
                        Informar enlace incorrecto
                      </button>
                      <button
                        type="button"
                        className="cm-btn-ghost"
                        style={{ fontSize: 11.5, padding: "4px 8px" }}
                        onClick={() => setRequestModal({ artistId: a.artistId, artistName: a.artistName, launchId: a.launchId, pmEmails: a.responsiblePms, tipo: "observacion" })}
                      >
                        Dejar observación
                      </button>
                    </div>
                    <ArtistHistory artistId={a.artistId} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {requestModal && (
        <RequestModal
          artist={requestModal}
          pmEmails={requestModal.pmEmails}
          initialTipo={requestModal.tipo}
          onClose={() => setRequestModal(null)}
          onSent={() => {
            setRequestModal(null);
            setSentNotice(true);
          }}
        />
      )}
    </CmShell>
  );
}

export default function CmPmsPage() {
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <CmPmsInner />
    </RequireRole>
  );
}
