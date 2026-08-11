"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { SELLOS } from "@/lib/sellos";
import type { LegalContract } from "@/lib/db/legalContracts";
import { LegalShell, DocusignImportModal } from "../_shared";

type Artist = { id: string; name: string; sello: string | null; photoUrl: string | null };

// Case/accent/whitespace-insensitive — un contrato guardado como "Candu
// Dominguez" (sin acento) tiene que seguir matcheando al artista del roster
// "Candu Domínguez", si no el contrato queda invisible pese a existir.
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export default function ContratosGridPage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Contratos de Artistas" subtitle="Elegí un artista para ver o cargar sus contratos." backHref="/panel/legal">
        <ArtistGrid />
      </LegalShell>
    </RequireRole>
  );
}

function ArtistGrid() {
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [contracts, setContracts] = useState<LegalContract[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selloFilter, setSelloFilter] = useState("");
  const [showDocusignImport, setShowDocusignImport] = useState(false);

  function loadContracts() {
    fetch("/api/legal/contracts")
      .then((r) => r.json())
      .then((d) => !d.error && setContracts(d.contracts))
      .catch(() => {});
  }

  useEffect(() => {
    fetch("/api/legal/artists")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setArtists(d.artists)))
      .catch((e) => setError(String(e)));
    loadContracts();
  }, []);

  // Muchos contratos son de artistas "Potencial" (prospectos) que todavía no
  // tienen fila en el roster oficial — sin esto, esos contratos quedan sin
  // ninguna tarjeta para acceder a ellos, aunque existan en la base.
  const allArtists = useMemo(() => {
    const base = artists ?? [];
    if (!contracts) return base;
    const known = new Set(base.map((a) => normalizeName(a.name)));
    const orphans = new Map<string, Artist>();
    for (const c of contracts) {
      const key = normalizeName(c.artist);
      if (known.has(key) || orphans.has(key)) continue;
      orphans.set(key, { id: `orphan-${key}`, name: c.artist, sello: null, photoUrl: null });
    }
    return [...base, ...orphans.values()];
  }, [artists, contracts]);

  const contractCountByArtist = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contracts ?? []) {
      const key = normalizeName(c.artist);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [contracts]);

  const visible = allArtists.filter(
    (a) => a.name.toLowerCase().includes(filter.toLowerCase()) && (!selloFilter || a.sello === selloFilter)
  );

  return (
    <>
      <div className="legal-toolbar" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input className="legal-search" placeholder="Buscar artista..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select className="legal-search" value={selloFilter} onChange={(e) => setSelloFilter(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">Todos los sellos</option>
            {SELLOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="legal-btn-primary" onClick={() => setShowDocusignImport(true)}>
          Importar desde DocuSign
        </button>
      </div>

      {showDocusignImport && (
        <DocusignImportModal
          onClose={() => setShowDocusignImport(false)}
          onImported={loadContracts}
        />
      )}

      {error && <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {!artists ? (
        <p className="muted">Cargando...</p>
      ) : visible.length === 0 ? (
        <p className="muted">Sin resultados.</p>
      ) : (
        <div className="legal-artist-grid">
          {visible.map((a) => {
            const count = contractCountByArtist.get(normalizeName(a.name)) ?? 0;
            return (
              <Link key={a.id} href={`/panel/legal/contratos/${encodeURIComponent(a.name)}`} className="legal-artist-card">
                <div className="legal-artist-avatar">
                  {a.photoUrl ? <img src={a.photoUrl} alt={a.name} /> : a.name.charAt(0).toUpperCase()}
                </div>
                <div className="legal-artist-name">{a.name}</div>
                <div className="legal-artist-meta">{a.sello ?? "Sin sello"}</div>
                <div className="legal-artist-count">{count > 0 ? `${count} contrato${count > 1 ? "s" : ""}` : "Sin contratos"}</div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
