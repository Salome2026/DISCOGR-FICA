"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { PublishingShell } from "../../_shared";

type SplitPerson = { personId: string; personName: string; percentX100: number };
type PersonFicha = {
  id: string;
  nombreCompleto: string | null;
  apellido: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  sadaic: string | null;
  ipi: string | null;
};
type EditorialSplit = {
  id: string;
  trackName: string;
  artistDisplay: string;
  sello: string | null;
  letra: SplitPerson[];
  musica: SplitPerson[];
  letraUrl: string | null;
  letraNombre: string | null;
  audioUrl: string | null;
  estado: "Pendiente" | "Enviado";
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

// Publishing necesita DNI/domicilio/fecha de nacimiento/SADAIC/IPI reales
// para poder registrar el split — antes esta vista solo mostraba nombre y
// porcentaje, así que había que ir a buscar el resto a mano en "Datos de
// artistas". La ficha completa se trae por separado (fichas keyed por
// personId) porque el split en sí solo guarda nombre+%, no una copia de
// los datos personales.
function SplitPersonList({ title, people, fichas }: { title: string; people: SplitPerson[]; fichas: Record<string, PersonFicha | undefined> }) {
  const total = people.reduce((s, p) => s + p.percentX100, 0);
  return (
    <div className="split-detail-section">
      <div className="split-detail-title">{title}</div>
      {people.map((p) => {
        const f = fichas[p.personId];
        return (
          <div key={p.personId} className="split-person-block">
            <div className="split-person-row">
              <span>{p.personName}</span>
              <span>{formatX100(p.percentX100)}%</span>
            </div>
            {f ? (
              <div className="split-person-ficha">
                <span>DNI: {f.dni || "—"}</span>
                <span>Nacimiento: {f.fechaNacimiento || "—"}</span>
                <span>SADAIC: {f.sadaic || "—"}</span>
                <span>IPI: {f.ipi || "—"}</span>
                <span>Domicilio: {f.direccion || "—"}</span>
                <span>Email: {f.email || "—"}</span>
                <span>Teléfono: {f.telefono || "—"}</span>
              </div>
            ) : (
              <div className="split-person-ficha muted">No encontramos su ficha en Datos de artistas.</div>
            )}
          </div>
        );
      })}
      <div className="split-total-row">
        <span>TOTAL</span>
        <span>{formatX100(total)}%</span>
      </div>
    </div>
  );
}

export default function SplitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["editorial"]}>
      <PublishingShell title="Detalle del split" backHref="/panel/publishing/splits">
        <SplitDetail id={id} />
      </PublishingShell>
    </RequireRole>
  );
}

function SplitDetail({ id }: { id: string }) {
  const router = useRouter();
  const [split, setSplit] = useState<EditorialSplit | null | undefined>(undefined);
  const [fichas, setFichas] = useState<Record<string, PersonFicha | undefined>>({});
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/publishing/splits/${id}`)
      .then((r) => r.json())
      .then((d) => setSplit(d.split ?? null));
  }
  useEffect(load, [id]);

  useEffect(() => {
    if (!split) return;
    const ids = [...new Set([...split.letra, ...split.musica].map((p) => p.personId))];
    Promise.all(
      ids.map((personId) =>
        fetch(`/api/publishing/artists/${personId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => [personId, d?.artist as PersonFicha | undefined] as const)
      )
    ).then((entries) => setFichas(Object.fromEntries(entries)));
  }, [split]);

  async function handleMarkSent() {
    setMarking(true);
    setError(null);
    try {
      const res = await fetch(`/api/publishing/splits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "marcar_enviado" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar como enviado.");
      setSplit(data.split);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setMarking(false);
    }
  }

  if (split === undefined) return <p className="muted">Cargando...</p>;
  if (split === null) return <div className="pub-card split-empty">No encontramos ese split.</div>;

  return (
    <div className="pub-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{split.trackName}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {split.artistDisplay}
            {split.sello ? ` · ${split.sello}` : ""}
          </div>
        </div>
        <span className={`split-badge ${split.estado === "Pendiente" ? "pendiente" : "enviado"}`}>{split.estado}</span>
      </div>

      <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
        Cargado por {split.createdBy} · {formatDateTime(split.createdAt)}
        {split.estado === "Enviado" && split.sentAt && (
          <>
            <br />
            Enviado por {split.sentBy} · {formatDateTime(split.sentAt)}
          </>
        )}
      </div>

      {(split.letraUrl || split.audioUrl) && (
        <div className="split-detail-section">
          <div className="split-detail-title">ARCHIVOS</div>
          {split.letraUrl && (
            <div className="split-person-row">
              <span>Documento de letra</span>
              <a href={split.letraUrl} target="_blank" rel="noopener noreferrer">
                {split.letraNombre || "Ver documento"}
              </a>
            </div>
          )}
          {split.audioUrl && (
            <div className="split-person-row">
              <span>Audio</span>
              <a href={split.audioUrl} target="_blank" rel="noopener noreferrer">
                Escuchar
              </a>
            </div>
          )}
        </div>
      )}

      <SplitPersonList title="LETRA" people={split.letra} fichas={fichas} />
      <SplitPersonList title="MÚSICA" people={split.musica} fichas={fichas} />

      {error && <div style={{ color: "var(--crit-ink)", fontSize: 13, marginTop: 14 }}>{error}</div>}

      {split.estado === "Pendiente" && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button className="pub-btn-primary" disabled={marking} onClick={handleMarkSent}>
            {marking ? "Marcando..." : "✓ Marcar como enviado"}
          </button>
        </div>
      )}

      {split.estado === "Enviado" && (
        <div style={{ marginTop: 24 }}>
          <button className="pub-btn-ghost" onClick={() => router.push("/panel/publishing/splits/historico")}>
            Volver al histórico
          </button>
        </div>
      )}
    </div>
  );
}
