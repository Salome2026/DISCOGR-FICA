"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { TOURMANAGER_STYLES } from "../../panel/tourmanager/_shared";
import HojaSummary from "../../panel/tourmanager/HojaSummary";
import type { HojaDeRuta } from "@/lib/db/tourManager";

const RouteMap = dynamic(() => import("../../panel/tourmanager/RouteMap"), { ssr: false });

// Público, sin login — el token largo y aleatorio es el único control de
// acceso. Solo lectura: no hay Editar/Borrar/Duplicar acá.
export default function SharedHojaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [hoja, setHoja] = useState<HojaDeRuta | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/tourmanager/share/${token}`)
      .then((r) => r.json())
      .then((d: { hoja?: HojaDeRuta }) => setHoja(d.hoja ?? null));
  }, [token]);

  return (
    <div className="tm-root bg-atmosphere" style={{ minHeight: "100vh", fontFamily: "var(--font-display)", color: "var(--text-1)", paddingBottom: "4rem" }}>
      <style>{TOURMANAGER_STYLES}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 2rem 0" }}>
        <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
          Tour Manager · Hoja de ruta
        </div>

        {hoja === undefined && <p style={{ color: "var(--text-3)" }}>Cargando...</p>}
        {hoja === null && <p style={{ color: "var(--text-3)" }}>Este link ya no está disponible.</p>}
        {hoja && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-.02em" }}>{hoja.artistName}</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>Itinerario y Hospitality</p>
            <div style={{ marginBottom: 14 }}>
              <RouteMap hoja={hoja} />
            </div>
            <HojaSummary hoja={hoja} />
          </>
        )}
      </div>
    </div>
  );
}
