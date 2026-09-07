"use client";

import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { OpShell } from "./_shared";

function OpHomeContent() {
  return (
    <OpShell title="OP" homeMaxWidth>
      <div className="op-home-grid" style={{ marginBottom: "1.75rem" }}>
        <Link href="/panel/op/ogs" className="op-big-btn">
          <h2>OGS</h2>
          <p>Catálogo principal de fonogramas — ISRC, UPC, sello y cruce con CAPIF.</p>
        </Link>
        <Link href="/panel/op/remix" className="op-big-btn">
          <h2>REMIX</h2>
          <p>Remixes y versiones — mismo shape que OGS, sin cruce CAPIF.</p>
        </Link>
        <Link href="/panel/op/isrc-audio" className="op-big-btn">
          <h2>ISRC 2026 Audio</h2>
          <p>Asignación de ISRC de audio — filtrable por año (2024/2025/2026).</p>
        </Link>
        <Link href="/panel/op/isrc-video" className="op-big-btn">
          <h2>ISRC 2026 Video</h2>
          <p>Asignación de ISRC de video — filtrable por año (2024/2025/2026).</p>
        </Link>
        <Link href="/panel/op/participaciones" className="op-big-btn">
          <h2>Participaciones</h2>
          <p>Splits de derechos de máster por participante y porcentaje.</p>
        </Link>
        <Link href="/panel/op/repertorio-capif" className="op-big-btn">
          <h2>Repertorio CAPIF</h2>
          <p>Repertorio afiliado — editarlo actualiza el cruce de OGS/REMIX al instante.</p>
        </Link>
      </div>

      <div className="op-card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Bases auxiliares e históricos</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/panel/op/isrc-audio?year=2024" className="op-signout" style={{ textDecoration: "none" }}>ISRC 2024 Audio</Link>
          <Link href="/panel/op/isrc-video?year=2024" className="op-signout" style={{ textDecoration: "none" }}>ISRC 2024 Video</Link>
          <Link href="/panel/op/isrc-audio?year=2025" className="op-signout" style={{ textDecoration: "none" }}>ISRC 2025 Audio</Link>
          <Link href="/panel/op/isrc-video?year=2025" className="op-signout" style={{ textDecoration: "none" }}>ISRC 2025 Video</Link>
          <Link href="/panel/op/duplicados" className="op-signout" style={{ textDecoration: "none" }}>Duplicados (histórico)</Link>
          <Link href="/panel/op/duplicados-en-vivo" className="op-signout" style={{ textDecoration: "none" }}>Detectar duplicados (en vivo)</Link>
          <Link href="/panel/op/indyana-old" className="op-signout" style={{ textDecoration: "none" }}>INDYANA (old)</Link>
          <Link href="/panel/op/temp" className="op-signout" style={{ textDecoration: "none" }}>Temp</Link>
        </div>
      </div>
    </OpShell>
  );
}

export default function OpHomePage() {
  return (
    <RequireRole allow={["op"]}>
      <OpHomeContent />
    </RequireRole>
  );
}
