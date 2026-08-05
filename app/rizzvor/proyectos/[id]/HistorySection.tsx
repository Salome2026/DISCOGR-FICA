"use client";

import { useEffect, useState } from "react";
import type { RizzvorProjectHistoryEntry } from "@/lib/db/rizzvorProjects";

const ACTION_LABELS: Record<string, string> = {
  created: "Proyecto creado",
  updated: "Datos actualizados",
  status_changed: "Cambio de estado",
  song_status_changed: "Cambio de estado de canción",
  song_added: "Canción agregada",
  song_removed: "Canción eliminada",
  file_uploaded: "Archivo subido",
  file_removed: "Archivo eliminado",
  checklist_toggled: "Checklist actualizado",
  comment_added: "Comentario agregado",
  converted: "Convertido a lanzamiento",
  archived: "Proyecto archivado",
};

export default function HistorySection({ projectId }: { projectId: string }) {
  const [history, setHistory] = useState<RizzvorProjectHistoryEntry[] | null>(null);

  useEffect(() => {
    fetch(`/api/rizzvor/projects/${projectId}/history`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }, [projectId]);

  return (
    <div className="card">
      <style>{`
        .rzh-item { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line-soft); font-size: 12px; }
        .rzh-item:last-child { border-bottom: none; }
        .rzh-time { color: var(--text-3); white-space: nowrap; flex-shrink: 0; }
        .rzh-action { font-weight: 600; }
        .rzh-detail { color: var(--text-2); }
      `}</style>
      <div className="card-label">Historial de cambios</div>
      {history === null && <p style={{ color: "var(--text-3)", fontSize: 12.5 }}>Cargando...</p>}
      {history?.map((h) => (
        <div className="rzh-item" key={h.id}>
          <span className="rzh-time">{new Date(h.at).toLocaleString("es-AR")}</span>
          <span className="rzh-action">{ACTION_LABELS[h.action] ?? h.action}</span>
          {h.detail && <span className="rzh-detail">— {h.detail}</span>}
          <span style={{ color: "var(--text-3)", marginLeft: "auto" }}>{h.actorEmail}</span>
        </div>
      ))}
      {history?.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 12.5 }}>Sin actividad todavía.</p>}
    </div>
  );
}
