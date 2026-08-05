"use client";

import { useEffect, useState } from "react";
import type { RizzvorProjectComment } from "@/lib/db/rizzvorProjects";

export default function CommentsSection({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<RizzvorProjectComment[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  function reload() {
    fetch(`/api/rizzvor/projects/${projectId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []));
  }

  useEffect(reload, [projectId]);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    await fetch(`/api/rizzvor/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    setBody("");
    setSending(false);
    reload();
  }

  return (
    <div className="card">
      <style>{`
        .rzcm-item { padding: 9px 0; border-bottom: 1px solid var(--line-soft); }
        .rzcm-item:last-child { border-bottom: none; }
        .rzcm-head { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-3); margin-bottom: 3px; }
        .rzcm-body { font-size: 13px; white-space: pre-wrap; }
        .rzcm-compose { display: flex; gap: 8px; margin-top: 10px; }
        .rzcm-compose textarea { flex: 1; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 11px; color: var(--text-1); font-size: 13px; font-family: inherit; resize: vertical; min-height: 38px; }
        .rzcm-compose button { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 8px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 12.5px; align-self: flex-end; }
      `}</style>
      <div className="card-label">Comentarios internos</div>
      {comments === null && <p style={{ color: "var(--text-3)", fontSize: 12.5 }}>Cargando...</p>}
      {comments?.map((c) => (
        <div className="rzcm-item" key={c.id}>
          <div className="rzcm-head">
            <span>{c.authorEmail}</span>
            <span>{new Date(c.createdAt).toLocaleString("es-AR")}</span>
          </div>
          <div className="rzcm-body">{c.body}</div>
        </div>
      ))}
      {comments?.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 12.5 }}>Sin comentarios todavía.</p>}
      <div className="rzcm-compose">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Agregar un comentario..." />
        <button onClick={send} disabled={sending}>Comentar</button>
      </div>
    </div>
  );
}
