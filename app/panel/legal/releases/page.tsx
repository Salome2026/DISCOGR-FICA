"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { normalizeName } from "@/lib/participants";
import { LegalShell, Badge } from "../_shared";

type CatalogTrack = {
  id: string;
  track: string;
  release_date: string | null;
  company: string | null;
  artist_display: string;
  sello: string | null;
};

type Acuerdo = {
  id: string;
  nombre: string;
  compania: string | null;
  estado: string[];
};

export default function ReleasesPage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Releases / Fonogramas" backHref="/panel/legal">
        <ReleasesTab />
      </LegalShell>
    </RequireRole>
  );
}

function ReleasesTab() {
  const [tracks, setTracks] = useState<CatalogTrack[] | null>(null);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/legal/releases")
      .then((r) => r.json())
      .then((d) => !d.error && setTracks(d.tracks))
      .catch((e) => setError(String(e)));
    fetch("/api/acuerdos")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setAcuerdos(d.acuerdos)))
      .catch((e) => setError(String(e)));
  }, []);

  const acuerdoByArtist = useMemo(() => {
    const map = new Map<string, Acuerdo>();
    for (const a of acuerdos ?? []) map.set(normalizeName(a.nombre), a);
    return map;
  }, [acuerdos]);

  const visible = (tracks ?? []).filter((t) => t.artist_display.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="legal-card">
      <div className="legal-toolbar">
        <input className="legal-search" placeholder="Buscar por artista..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {!tracks ? (
        <p className="muted">Cargando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fonograma</th>
              <th>Artista(s)</th>
              <th>Sello</th>
              <th>Fecha</th>
              <th>Estado del acuerdo</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const names = t.artist_display.split("|").map((s) => s.trim());
              const acuerdo = names.map((n) => acuerdoByArtist.get(normalizeName(n))).find(Boolean);
              return (
                <tr key={t.id}>
                  <td>{t.track}</td>
                  <td className="muted">{names.join(", ")}</td>
                  <td className="muted">{t.sello ?? t.company ?? "—"}</td>
                  <td className="muted">{t.release_date ?? "—"}</td>
                  <td>
                    {acuerdo && acuerdo.estado.length > 0 ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {acuerdo.estado.map((e) => <Badge key={e} label={e} />)}
                      </div>
                    ) : (
                      <span className="muted">Sin acuerdo registrado</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
