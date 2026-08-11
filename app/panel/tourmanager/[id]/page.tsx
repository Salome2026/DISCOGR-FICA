"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { TourManagerShell } from "../_shared";
import HojaForm from "../HojaForm";
import type { HojaDeRuta } from "@/lib/db/tourManager";

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tm-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="tm-card-label">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 12 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}

function HojaDetail({ id }: { id: string }) {
  const router = useRouter();
  const [hoja, setHoja] = useState<HojaDeRuta | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  function load() {
    fetch(`/api/tourmanager/${id}`)
      .then((r) => r.json())
      .then((d: { hoja?: HojaDeRuta }) => setHoja(d.hoja ?? null));
  }
  useEffect(load, [id]);

  async function handleDelete() {
    if (!confirm("¿Borrar esta hoja de ruta?")) return;
    await fetch(`/api/tourmanager/${id}`, { method: "DELETE" });
    router.push("/panel/tourmanager");
  }

  if (hoja === undefined) {
    return (
      <TourManagerShell backHref="/panel/tourmanager">
        <p style={{ color: "var(--text-3)" }}>Cargando...</p>
      </TourManagerShell>
    );
  }
  if (hoja === null) {
    return (
      <TourManagerShell backHref="/panel/tourmanager">
        <p style={{ color: "var(--text-3)" }}>Hoja de ruta no encontrada.</p>
      </TourManagerShell>
    );
  }

  return (
    <TourManagerShell backHref="/panel/tourmanager" title={hoja.artistName} subtitle={`Itinerario y Hospitality`}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setEditing(true)}
          style={{ background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Editar
        </button>
        <button
          onClick={handleDelete}
          style={{ background: "var(--crit-bg)", border: "1px solid transparent", borderRadius: 8, padding: "8px 16px", color: "var(--crit-ink)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Borrar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        <Section title="Información general">
          <Row label="Artista" value={hoja.artistName} />
          <Row label="Evento" value={hoja.tipoEvento} />
          <Row label="Fecha" value={formatFecha(hoja.fecha)} />
          <Row label="Horario del show" value={hoja.horaShow} />
          <Row label="Ciudad" value={hoja.venueCiudad} />
          <Row label="País" value={hoja.venuePais} />
        </Section>

        <Section title="Venue">
          <Row label="Nombre" value={hoja.venue} />
          <Row label="Dirección" value={hoja.venueFullAddress ?? hoja.venueDireccion} />
          <Row label="Contacto" value={hoja.venueContactoNombre} />
          <Row label="Teléfono" value={hoja.venueContactoTelefono} />
          <Row label="Duración del show" value={hoja.duracionShowMin ? `${hoja.duracionShowMin} min` : null} />
        </Section>

        <Section title="Cronograma de traslados">
          <Row label="Salida" value={hoja.horaSalida ? `${hoja.horaSalida} (${hoja.origenLabel ?? hoja.origenDireccion ?? "origen"})` : null} />
          <Row label="Llegada al venue" value={hoja.horaLlegadaVenue} />
          <Row label="Presentación" value={hoja.horaShow} />
          <Row label="Salida del venue" value={hoja.horaSalidaVenue} />
          <Row label="Llegada a destino" value={hoja.horaLlegadaDestino} />
        </Section>

        <Section title="Traslados detallados">
          <Row label="Pax" value={hoja.pax != null ? String(hoja.pax) : null} />
          <Row label="Driver" value={hoja.driverNombre} />
          <Row label="Tel. driver" value={hoja.driverTelefono} />
        </Section>

        <Section title="Contactos">
          <Row label="Contacto artista" value={hoja.contactoArtistaNombre} />
          <Row label="Tel. artista" value={hoja.contactoArtistaTelefono} />
          <Row label="Artist Liaison" value={hoja.artistLiaisonNombre} />
          <Row label="Tel. liaison" value={hoja.artistLiaisonTelefono} />
        </Section>

        <Section title="Distancias">
          <Row label="Origen → Venue" value={hoja.distanciaIdaKm != null || hoja.duracionIdaMin != null ? `${hoja.duracionIdaMin ?? "—"} min (${hoja.distanciaIdaKm ?? "—"} km)` : null} />
          <Row label="Venue → Origen" value={hoja.distanciaVueltaKm != null || hoja.duracionVueltaMin != null ? `${hoja.duracionVueltaMin ?? "—"} min (${hoja.distanciaVueltaKm ?? "—"} km)` : null} />
        </Section>

        {hoja.runningOrder && (
          <Section title="Running Order">
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{hoja.runningOrder}</div>
          </Section>
        )}

        {hoja.notas && (
          <Section title="Notas">
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{hoja.notas}</div>
          </Section>
        )}
      </div>

      {editing && (
        <HojaForm
          hoja={hoja}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </TourManagerShell>
  );
}

export default function HojaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole allow={["tourmanager"]}>
      <HojaDetail id={id} />
    </RequireRole>
  );
}
