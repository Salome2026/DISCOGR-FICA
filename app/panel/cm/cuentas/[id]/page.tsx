"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { CmShell, CM_TIPO_LABELS, CM_ESTADO_LABELS } from "../../_shared";

type Account = {
  id: string; name: string; platform: string; handle: string | null; url: string | null;
  sello: string | null; frecuenciaPublicacionAcordada: string | null; active: boolean;
};
type ContentItem = {
  id: number; tipoContenido: string; fecha: string; hora: string | null; estado: string;
  copyText: string | null; assetsUrl: string | null; publishedUrl: string | null;
};
type Note = { id: number; author_email: string; body: string; created_at: string };

function AccountDetail({ id }: { id: string }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [growth, setGrowth] = useState<Record<string, unknown> | null>(null);
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/cm/cuentas/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setAccount(null); return; }
        setAccount(d.account);
        setNotes(d.notes ?? []);
      });
    fetch(`/api/cm/cuentas/${id}/metricas`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setContent(d.content ?? []); setGrowth(d.growth ?? null); } });
  }
  useEffect(load, [id]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    const res = await fetch(`/api/cm/cuentas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: newNote.trim() }),
    });
    if (res.ok) { setNewNote(""); load(); }
  }

  if (account === undefined) return <CmShell active="cuentas"><p style={{ color: "var(--text-3)" }}>Cargando...</p></CmShell>;
  if (account === null) return <CmShell active="cuentas"><div className="cm-badge crit">{error ?? "No encontrada"}</div></CmShell>;

  const pendientes = content.filter((c) => !["publicado", "cancelado"].includes(c.estado));
  const publicados = content.filter((c) => c.estado === "publicado");

  return (
    <CmShell title={account.name} subtitle={`${account.platform}${account.handle ? ` · ${account.handle}` : ""}`} active="cuentas">
      <Link href="/panel/cm/cuentas" style={{ fontSize: 12.5, color: "var(--text-3)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
        ← Volver a cuentas
      </Link>

      <div className="cm-section">
        <div className="cm-card" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-2)" }}>
          {account.url && <a href={account.url} target="_blank" rel="noreferrer" style={{ color: "var(--text-1)" }}>Abrir cuenta ↗</a>}
          {account.sello && <span>Sello: <strong style={{ color: "var(--text-1)" }}>{account.sello}</strong></span>}
          {account.frecuenciaPublicacionAcordada && <span>Frecuencia acordada: <strong style={{ color: "var(--text-1)" }}>{account.frecuenciaPublicacionAcordada}</strong></span>}
          <span>Publicados: <strong style={{ color: "var(--text-1)" }}>{publicados.length}</strong></span>
          <span>Pendientes: <strong style={{ color: "var(--text-1)" }}>{pendientes.length}</strong></span>
        </div>
      </div>

      {growth && (
        <div className="cm-section">
          <div className="cm-section-title">Evolución</div>
          <div className="cm-card" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
            <span>Seguidores: <strong>{String(growth.seguidores ?? "—")}</strong></span>
            <span>Hace 7 días: <strong>{String(growth.seguidores_hace_7d ?? "—")}</strong></span>
            <span>Hace 30 días: <strong>{String(growth.seguidores_hace_30d ?? "—")}</strong></span>
            <span>Alcance: <strong>{String(growth.alcance ?? "—")}</strong></span>
          </div>
        </div>
      )}

      <div className="cm-section">
        <div className="cm-section-title">Contenido pendiente</div>
        {pendientes.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin contenido pendiente.</p>
        ) : (
          <div className="cm-grid">
            {pendientes.map((c) => (
              <div key={c.id} className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{CM_TIPO_LABELS[c.tipoContenido] ?? c.tipoContenido}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{c.fecha.slice(0, 10)}{c.hora ? ` · ${c.hora}` : ""}</div>
                <span className="cm-badge">{CM_ESTADO_LABELS[c.estado] ?? c.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Publicados recientes</div>
        {publicados.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin publicaciones registradas todavía.</p>
        ) : (
          <div className="cm-grid">
            {publicados.slice(0, 6).map((c) => (
              <div key={c.id} className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{CM_TIPO_LABELS[c.tipoContenido] ?? c.tipoContenido}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{c.fecha.slice(0, 10)}</div>
                {c.publishedUrl && <a href={c.publishedUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>Ver publicación ↗</a>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cm-section">
        <div className="cm-section-title">Observaciones</div>
        <div className="cm-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin observaciones todavía.</p>}
          {notes.map((n) => (
            <div key={n.id} style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: 8 }}>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{n.author_email} · {new Date(n.created_at).toLocaleString("es-AR")}</div>
              <div style={{ fontSize: 13.5 }}>{n.body}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <input className="cm-input" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Agregar una observación..." />
            <button type="button" className="cm-btn" onClick={handleAddNote}>Agregar</button>
          </div>
        </div>
      </div>
    </CmShell>
  );
}

export default function CmAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["community_manager", "management"]}>
      <AccountDetail id={id} />
    </RequireRole>
  );
}
