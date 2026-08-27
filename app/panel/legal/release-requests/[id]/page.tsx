"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { LegalShell } from "../../_shared";

type ReleaseParticipant = {
  nombre: string;
  apellido: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  domicilio: string | null;
  email: string | null;
  percentX100: number;
};

type LegalReleaseRequest = {
  id: string;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  fechaLanzamiento: string | null;
  tipo: "Artista" | "Sello" | "PPD" | null;
  participants: ReleaseParticipant[];
  estado: "Pendiente de envío" | "Enviado";
  createdBy: string;
  createdAt: string;
  sentBy: string | null;
  sentAt: string | null;
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="rlr-field-label">{label}</div>
      <div className="rlr-field-value">{value}</div>
    </div>
  );
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

  async function handleMarkSent() {
    setMarking(true);
    setError(null);
    try {
      const res = await fetch(`/api/legal/release-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "marcar_enviado" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar como enviado.");
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
        <div style={{ fontSize: 19, fontWeight: 700 }}>{request.trackName}</div>
        <span className={`rlr-badge ${request.estado === "Pendiente de envío" ? "pendiente" : "enviado"}`}>
          {request.estado}
        </span>
      </div>

      <div className="rlr-field-grid" style={{ marginTop: 16 }}>
        <Field label="Artista" value={request.artistDisplay} />
        <Field label="Sello" value={request.sello || "—"} />
        <Field label="Fecha de lanzamiento" value={formatDate(request.fechaLanzamiento)} />
        <Field label="Reparto" value={request.tipo || "—"} />
      </div>

      <div className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>
        Cargado por {request.createdBy} · {formatDateTime(request.createdAt)}
        {request.estado === "Enviado" && request.sentAt && (
          <>
            <br />
            Enviado por {request.sentBy} · {formatDateTime(request.sentAt)}
          </>
        )}
      </div>

      <div className="rlr-detail-section">
        <div className="rlr-detail-title">PARTICIPANTES</div>
        {request.participants.map((p, i) => (
          <div key={i} className="rlr-participant-card">
            <div className="rlr-participant-fields">
              <Field label="Nombre" value={[p.nombre, p.apellido].filter(Boolean).join(" ") || "—"} />
              <Field label="DNI" value={p.dni || "—"} />
              <Field label="Fecha de nacimiento" value={formatDate(p.fechaNacimiento)} />
              <Field label="Domicilio" value={p.domicilio || "—"} />
              <Field label="Email" value={p.email || "—"} />
            </div>
            <div className="rlr-participant-percent">
              <Field label="% de participación" value={`${formatX100(p.percentX100)}%`} />
            </div>
          </div>
        ))}
        <div className="rlr-total-row">
          <span>TOTAL</span>
          <span>{formatX100(total)}%</span>
        </div>
      </div>

      {error && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginTop: 14 }}>{error}</div>}

      {request.estado === "Pendiente de envío" && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button className="legal-btn-primary" disabled={marking} onClick={handleMarkSent}>
            {marking ? "Marcando..." : "✓ Marcar como enviado"}
          </button>
        </div>
      )}

      {request.estado === "Enviado" && (
        <div style={{ marginTop: 24 }}>
          <button className="legal-btn-ghost" onClick={() => router.push("/panel/legal/release-requests")}>
            Volver al listado
          </button>
        </div>
      )}
    </div>
  );
}
