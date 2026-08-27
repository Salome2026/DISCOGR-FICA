"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReleaseRequestCard = {
  id: string;
  trackName: string;
  artistDisplay: string;
  tipo: "Artista" | "Sello" | "PPD" | null;
  estado: "Pendiente de envío" | "Revisado";
  createdBy: string;
  createdAt: string;
  reviewedAt: string | null;
};

function formatDate(v: string): string {
  return v.slice(0, 10);
}

export default function ReleaseRequestsPending({ limit }: { limit?: number }) {
  const [requests, setRequests] = useState<ReleaseRequestCard[] | null>(null);

  useEffect(() => {
    fetch("/api/legal/release-requests?estado=Pendiente de envío")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []));
  }, []);

  if (!requests) return <p className="muted">Cargando releases pendientes...</p>;

  const visible = limit ? requests.slice(0, limit) : requests;

  return (
    <div className="legal-card">
      <div className="legal-toolbar">
        <div style={{ fontSize: 16, fontWeight: 700 }}>Releases pendientes de envío</div>
        {limit && requests.length > limit && (
          <Link href="/panel/legal/release-requests" className="rlr-see-all">
            Ver todas →
          </Link>
        )}
      </div>
      {visible.length === 0 ? (
        <div className="rlr-empty">No hay Releases pendientes por ahora.</div>
      ) : (
        <div className="rlr-list">
          {visible.map((r) => (
            <Link key={r.id} href={`/panel/legal/release-requests/${r.id}`} className="rlr-card">
              <div>
                <div className="rlr-card-title">{r.trackName}</div>
                <div className="rlr-card-meta">
                  {r.artistDisplay} · Cargado por {r.createdBy} · {formatDate(r.createdAt)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {r.tipo && <span className="rlr-badge tipo">{r.tipo}</span>}
                <span className="rlr-badge pendiente">Pendiente</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
