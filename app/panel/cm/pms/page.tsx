"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CmAvatar, CM_MATERIALES_LABELS } from "../_shared";

type PmArtist = {
  artistId: string; artistName: string; photoUrl: string | null; role: "owner" | "collaborator";
  materialesEstado: string | null; fechaLanzamiento: string | null;
};
type Pm = { email: string; name: string; artists: PmArtist[] };

function CmPmsInner() {
  const [pms, setPms] = useState<Pm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPm, setFilterPm] = useState("");
  const [filterArtist, setFilterArtist] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

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
                  <div key={`${pm.email}-${a.artistId}`} className="cm-card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                ))}
              </div>
            </div>
          ))}
        </div>
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
