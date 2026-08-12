"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { PublishingShell } from "../../_shared";

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

export default function SplitsHistoricoPage() {
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingShell title="Histórico de splits" subtitle="Todos los splits ya enviados." backHref="/panel/publishing">
        <HistoricoList />
      </PublishingShell>
    </RequireRole>
  );
}

function HistoricoList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [splits, setSplits] = useState<SplitCard[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/publishing/splits?estado=Enviado${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`)
        .then((r) => r.json())
        .then((d) => setSplits(d.splits ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <>
      <div className="pub-toolbar">
        <input className="pub-search" placeholder="Buscar por canción o artista..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!splits ? (
        <p className="muted">Cargando...</p>
      ) : splits.length === 0 ? (
        <div className="pub-card split-empty">{q ? "No encontramos ningún split con esa búsqueda." : "Todavía no hay splits enviados."}</div>
      ) : (
        <div className="split-list">
          {splits.map((s) => (
            <div key={s.id} className="split-card" onClick={() => router.push(`/panel/publishing/splits/${s.id}`)}>
              <div>
                <div className="split-card-title">{s.trackName}</div>
                <div className="split-card-meta">
                  {s.artistDisplay} · Cargado por {s.createdBy} · Enviado {s.sentAt ? formatDate(s.sentAt) : ""}
                </div>
              </div>
              <span className="split-badge enviado">Enviado</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
