"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { LegalShell } from "../../_shared";

const RELEASE_PARTICIPANT_TIPOS = ["Artista", "Sello", "PPD"] as const;

type ReleaseParticipant = {
  nombre: string;
  apellido: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  domicilio: string | null;
  email: string | null;
  tipo: (typeof RELEASE_PARTICIPANT_TIPOS)[number];
  percentX100: number;
};

type LegalReleaseRequest = {
  id: string;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  participants: ReleaseParticipant[];
  estado: "Pendiente de envío" | "Revisado";
  createdBy: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

function formatX100(x100: number): string {
  return (x100 / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

function formatDateTime(v: string): string {
  return new Date(v).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(v: string | null): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

export default function ReleaseRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["legal"]}>
      <LegalShell title="Detalle del Release" backHref="/panel/legal/release-requests">
        <ReleaseRequestDetail id={id} />
      </LegalShell>
    </RequireRole>
  );
}

function ReleaseRequestDetail({ id }: { id: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<LegalReleaseRequest | null | undefined>(undefined);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/legal/release-requests/${id}`)
      .then((r) => r.json())
      .then((d) => setRequest(d.request ?? null));
  }
  useEffect(load, [id]);

  async function handleMarkReviewed() {
    setMarking(true);
    setError(null);
    try {
      const res = await fetch(`/api/legal/release-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "marcar_revisado" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar como revisado.");
      setRequest(data.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setMarking(false);
    }
  }

  if (request === undefined) return <p className="muted">Cargando...</p>;
  if (request === null) return <div className="legal-card rlr-empty">No encontramos ese Release.</div>;

  const total = request.participants.reduce((s, p) => s + p.percentX100, 0);

  return (
    <div className="legal-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{request.trackName}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {request.artistDisplay}
            {request.sello ? ` · ${request.sello}` : ""}
            {request.fechaLanzamiento ? ` · Lanzamiento: ${formatDate(request.fechaLanzamiento)}` : ""}
          </div>
        </div>
        <span className={`rlr-badge ${request.estado === "Pendiente de envío" ? "pendiente" : "revisado"}`}>
          {request.estado === "Pendiente de envío" ? "Pendiente" : "Revisado"}
        </span>
      </div>

      <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
        Cargado por {request.createdBy} · {formatDateTime(request.createdAt)}
        {request.estado === "Revisado" && request.reviewedAt && (
          <>
            <br />
            Revisado por {request.reviewedBy} · {formatDateTime(request.reviewedAt)}
          </>
        )}
      </div>

      {RELEASE_PARTICIPANT_TIPOS.map((tipo) => {
        const people = request.participants.filter((p) => p.tipo === tipo);
        if (people.length === 0) return null;
        const subtotal = people.reduce((s, p) => s + p.percentX100, 0);
        return (
          <div key={tipo} className="rlr-detail-section">
            <div className="rlr-detail-title">{tipo.toUpperCase()}</div>
            {people.map((p, i) => (
              <div key={i} className="rlr-participant-row">
                <div>
                  <div>{[p.nombre, p.apellido].filter(Boolean).join(" ")}</div>
                  <div className="p-meta">
                    {p.dni ? `DNI ${p.dni}` : ""}
                    {p.fechaNacimiento ? ` · Nac. ${formatDate(p.fechaNacimiento)}` : ""}
                    {p.domicilio ? ` · ${p.domicilio}` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                  </div>
                </div>
                <span>{formatX100(p.percentX100)}%</span>
              </div>
            ))}
            <div className="rlr-total-row">
              <span>Subtotal {tipo}</span>
              <span>{formatX100(subtotal)}%</span>
            </div>
          </div>
        );
      })}
      <div className="rlr-detail-section">
        <div className="rlr-total-row">
          <span>TOTAL</span>
          <span>{formatX100(total)}%</span>
        </div>
      </div>

      {error && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginTop: 14 }}>{error}</div>}

      {request.estado === "Pendiente de envío" && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button className="legal-btn-primary" disabled={marking} onClick={handleMarkReviewed}>
            {marking ? "Marcando..." : "✓ Marcar como revisado"}
          </button>
        </div>
      )}

      {request.estado === "Revisado" && (
        <div style={{ marginTop: 24 }}>
          <button className="legal-btn-ghost" onClick={() => router.push("/panel/legal/release-requests")}>
            Volver al listado
          </button>
        </div>
      )}
    </div>
  );
}
