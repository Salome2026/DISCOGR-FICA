"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { PublishingShell } from "../_shared";

type SplitCard = {
  id: string;
  trackName: string;
  artistDisplay: string;
  estado: "Pendiente" | "Enviado";
  createdBy: string;
  createdAt: string;
  sentAt: string | null;
};

function formatDate(v: string): string {
  return v.slice(0, 10);
}

export default function SplitsPendientesPage() {
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingShell title="Splits pendientes de envío" subtitle="Splits cargados por Project Managers, listos para revisar." backHref="/panel/publishing">
        <PendientesList />
      </PublishingShell>
    </RequireRole>
  );
}

function PendientesList() {
  const router = useRouter();
  const [splits, setSplits] = useState<SplitCard[] | null>(null);

  useEffect(() => {
    fetch("/api/publishing/splits?estado=Pendiente")
      .then((r) => r.json())
      .then((d) => setSplits(d.splits ?? []));
  }, []);

  if (!splits) return <p className="muted">Cargando...</p>;
  if (splits.length === 0) return <div className="pub-card split-empty">No hay splits pendientes por ahora.</div>;

  return (
    <div className="split-list">
      {splits.map((s) => (
        <div key={s.id} className="split-card" onClick={() => router.push(`/panel/publishing/splits/${s.id}`)}>
          <div>
            <div className="split-card-title">{s.trackName}</div>
            <div className="split-card-meta">
              {s.artistDisplay} · Cargado por {s.createdBy} · {formatDate(s.createdAt)}
            </div>
          </div>
          <span className="split-badge pendiente">Pendiente</span>
        </div>
      ))}
    </div>
  );
}
