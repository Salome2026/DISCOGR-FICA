"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { OpShell } from "../_shared";
import type { OpLiveDuplicateGroup } from "@/lib/db/opDuplicados";

function DuplicadosEnVivoContent() {
  const [groups, setGroups] = useState<OpLiveDuplicateGroup[] | null>(null);

  useEffect(() => {
    fetch("/api/op/duplicados-en-vivo").then((r) => r.json()).then((d) => setGroups(d.groups ?? []));
  }, []);

  if (!groups) return <OpShell title="Detectar duplicados" backHref="/panel/op"><p style={{ color: "var(--text-3)" }}>Cargando...</p></OpShell>;

  return (
    <OpShell title="Detectar duplicados (en vivo)" subtitle={`${groups.length} coincidencias — ISRC/UPC repetidos entre OGS y REMIX ahora mismo`} backHref="/panel/op">
      {groups.length === 0 ? (
        <div className="op-card" style={{ textAlign: "center", color: "var(--text-3)" }}>No hay duplicados de ISRC ni UPC entre OGS y REMIX en este momento.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map((g) => (
            <div key={`${g.tipo}-${g.key}`} className="op-card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                {g.tipo.toUpperCase()} duplicado: {g.key}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.filas.map((f) => (
                  <div key={`${f.tabla}-${f.id}`} style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between" }}>
                    <span><span style={{ color: "var(--text-3)" }}>[{f.tabla.toUpperCase()}]</span> {f.trackArtist} — {f.track}</span>
                    <span style={{ color: "var(--text-3)" }}>ISRC: {f.isrc ?? "—"} · UPC: {f.upc ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </OpShell>
  );
}

export default function DuplicadosEnVivoPage() {
  return (
    <RequireRole allow={["op"]}>
      <DuplicadosEnVivoContent />
    </RequireRole>
  );
}
