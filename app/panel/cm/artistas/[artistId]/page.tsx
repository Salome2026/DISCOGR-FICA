"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CM_TIPO_LABELS, CM_ESTADO_LABELS, CM_MATERIALES_LABELS } from "../../_shared";

type Artist = { id: string; name: string; photoUrl: string | null };
type Account = { id: string; name: string; platform: string; handle: string | null; url: string | null };
type ContentItem = { id: number; tipoContenido: string; fecha: string; estado: string };
type Launch = { id: string; fonogramaNombre: string; fechaLanzamiento: string | null; materialesEstado: string };
type Growth = { accountId: string; growth: Record<string, unknown> | null };

function ArtistView({ artistId }: { artistId: string }) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [contentByAccount, setContentByAccount] = useState<{ accountId: string; items: ContentItem[] }[]>([]);
  const [growth, setGrowth] = useState<Growth[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cm/artistas/${artistId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setArtist(d.artist); setAccounts(d.accounts); setLaunches(d.launches);
        setContentByAccount(d.content); setGrowth(d.growth);
      });
  }, [artistId]);

  if (error) return <CmShell active="cuentas"><div className="cm-badge crit">{error}</div></CmShell>;
  if (!artist) return <CmShell active="cuentas"><p className="cm-empty">Cargando...</p></CmShell>;

  const allContent = contentByAccount.flatMap((c) => c.items);
  const pendientes = allContent.filter((c) => !["publicado", "cancelado"].includes(c.estado));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  return (
    <CmShell title={artist.name} subtitle="Vista combinada de todas sus redes" active="cuentas">
      <Link href="/panel/cm/cuentas" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
        ← Volver a cuentas
      </Link>

      <div className="cm-section">
        <div className="cm-section-title">Redes vinculadas</div>
        {accounts.length === 0 ? (
          <p className="cm-empty">Este artista todavía no tiene ninguna red vinculada.</p>
        ) : (
          <div className="cm-grid">
            {accounts.map((a) => {
              const g = growth.find((x) => x.accountId === a.id)?.growth;
              return (
                <Link key={a.id} href={`/panel/cm/cuentas/${a.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.name}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{a.platform}{a.handle ? ` · ${a.handle}` : ""}</div>
                  {g && <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>Seguidores: {String(g.seguidores ?? "—")}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Lanzamientos</div>
        {launches.length === 0 ? (
          <p className="cm-empty">Sin lanzamientos registrados todavía.</p>
        ) : (
          <div className="cm-grid">
            {launches.map((l) => (
              <Link key={l.id} href={`/panel/cm/lanzamientos/${l.id}`} className="cm-card" style={{ textDecoration: "none", color: "var(--text-1)", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{l.fonogramaNombre}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{l.fechaLanzamiento?.slice(0, 10) ?? "—"}</div>
                <span className={`cm-badge ${l.materialesEstado === "assets_disponibles" ? "ok" : "warn"}`}>
                  {CM_MATERIALES_LABELS[l.materialesEstado] ?? l.materialesEstado}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Contenido pendiente ({pendientes.length})</div>
        {pendientes.length === 0 ? (
          <p className="cm-empty">Sin contenido pendiente.</p>
        ) : (
          <div className="cm-grid">
            {pendientes.map((c) => {
              const acc = contentByAccount.find((x) => x.items.some((i) => i.id === c.id));
              const accountName = acc ? accountById.get(acc.accountId)?.name : null;
              return (
                <div key={c.id} className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{CM_TIPO_LABELS[c.tipoContenido] ?? c.tipoContenido}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{accountName} · {c.fecha.slice(0, 10)}</div>
                  <span className="cm-badge">{CM_ESTADO_LABELS[c.estado] ?? c.estado}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CmShell>
  );
}

export default function CmArtistPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <ArtistView artistId={artistId} />
    </RequireRole>
  );
}
