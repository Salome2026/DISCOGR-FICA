"use client";

import { use, useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { OpShell, OpHistorySection } from "../../_shared";
import type { OpIndyanaOld, OpAuditEntry } from "@discografica/shared/types/op";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="op-card" style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 13.5 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span><span>{value ?? "—"}</span>
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const [row, setRow] = useState<OpIndyanaOld | null | undefined>(undefined);
  const [history, setHistory] = useState<OpAuditEntry[] | null>(null);

  useEffect(() => {
    fetch(`/api/op/indyana-old/${id}`).then((r) => r.json()).then((d) => setRow(d.row ?? null));
    fetch(`/api/op/indyana-old/${id}/history`).then((r) => r.json()).then((d) => setHistory(d.history ?? []));
  }, [id]);

  if (row === undefined) return <p style={{ color: "var(--text-3)" }}>Cargando...</p>;
  if (row === null) return <p style={{ color: "var(--text-3)" }}>No encontramos ese registro.</p>;

  return (
    <>
      <div className="op-card">
        <div style={{ fontSize: 19, fontWeight: 700 }}>{row.titulo ?? "—"}</div>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>{row.mainArtists}</div>
      </div>
      <Section title="Datos">
        <Row label="Release Date" value={row.releaseDate} />
        <Row label="ISRC" value={row.isrc} />
        <Row label="ISRC Video" value={row.isrcVideo} />
        <Row label="Nombre EP/LP" value={row.nombreEpLp} />
        <Row label="UPC" value={row.upc} />
        <Row label="Main Artists" value={row.mainArtists} />
      </Section>
      <Section title="Historial de cambios"><OpHistorySection history={history} /></Section>
    </>
  );
}

export default function IndyanaOldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["op"]}>
      <OpShell title="Ficha INDYANA (old)" backHref="/panel/op/indyana-old">
        <Detail id={id} />
      </OpShell>
    </RequireRole>
  );
}
