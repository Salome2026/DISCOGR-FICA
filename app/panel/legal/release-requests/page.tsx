"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { LegalShell } from "../_shared";

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

export default function ReleaseRequestsPage() {
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Releases" subtitle="Todos los Releases cargados por Project Managers." backHref="/panel/legal">
        <ReleaseRequestsList />
      </LegalShell>
    </RequireRole>
  );
}

function ReleaseRequestsList() {
  const router = useRouter();
  const [estado, setEstado] = useState<"Pendiente de envío" | "Revisado">("Pendiente de envío");
  const [q, setQ] = useState("");
  const [requests, setRequests] = useState<ReleaseRequestCard[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/legal/release-requests?estado=${encodeURIComponent(estado)}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`)
        .then((r) => r.json())
        .then((d) => setRequests(d.requests ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [estado, q]);

  return (
    <>
      <div className="legal-toolbar">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={estado === "Pendiente de envío" ? "legal-btn-primary" : "legal-btn-ghost"}
            onClick={() => setEstado("Pendiente de envío")}
          >
            Pendientes
          </button>
          <button
            className={estado === "Revisado" ? "legal-btn-primary" : "legal-btn-ghost"}
            onClick={() => setEstado("Revisado")}
          >
            Revisados
          </button>
        </div>
        <input className="legal-search" placeholder="Buscar por canción o artista..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!requests ? (
        <p className="muted">Cargando...</p>
      ) : requests.length === 0 ? (
        <div className="rlr-empty">
          {q ? "No encontramos ningún Release con esa búsqueda." : estado === "Pendiente de envío" ? "No hay Releases pendientes." : "Todavía no hay Releases revisados."}
        </div>
      ) : (
        <div className="rlr-list">
          {requests.map((r) => (
            <div key={r.id} className="rlr-card" onClick={() => router.push(`/panel/legal/release-requests/${r.id}`)}>
              <div>
                <div className="rlr-card-title">{r.trackName}</div>
                <div className="rlr-card-meta">
                  {r.artistDisplay} · Cargado por {r.createdBy} ·{" "}
                  {estado === "Revisado" && r.reviewedAt ? `Revisado ${formatDate(r.reviewedAt)}` : formatDate(r.createdAt)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {r.tipo && <span className="rlr-badge tipo">{r.tipo}</span>}
                <span className={`rlr-badge ${estado === "Pendiente de envío" ? "pendiente" : "revisado"}`}>
                  {estado === "Pendiente de envío" ? "Pendiente" : "Revisado"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
