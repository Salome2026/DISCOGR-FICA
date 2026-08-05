"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { SELLOS } from "@/lib/sellos";
import type { LegalContract } from "@/lib/db/legalContracts";
import { LegalShell, DocusignImportModal } from "../_shared";

type Artist = { id: string; name: string; sello: string | null };

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

  const contractCountByArtist = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contracts ?? []) map.set(c.artist, (map.get(c.artist) ?? 0) + 1);
    return map;
  }, [contracts]);

  const visible = (artists ?? []).filter(
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
            const count = contractCountByArtist.get(a.name) ?? 0;
            return (
              <Link key={a.id} href={`/panel/legal/contratos/${encodeURIComponent(a.name)}`} className="legal-artist-card">
                <div className="legal-artist-avatar">{a.name.charAt(0).toUpperCase()}</div>
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
