"use client";

import { useState } from "react";
import { AddressField } from "./HojaForm";
import type { HojaGenerica, GenericShow } from "@discografica/shared/types/tourManager";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-1)",
  fontSize: 13,
  marginTop: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>{label}</label>
      {children}
    </div>
  );
}

// Client-side draft of one show — a synthetic key for React's list identity
// (never sent to the server), plus a venue "name" field kept separate from
// the venue AddressField's own free-text value, same split HojaForm already
// uses between `venue` (display name) and `venueDireccion` (what gets
// resolved).
type ShowDraft = GenericShow & { key: string };

function newShow(): ShowDraft {
  return {
    key: Math.random().toString(36).slice(2),
    fecha: null,
    horaShow: null,
    busquedaDireccion: null,
    busquedaFullAddress: null,
    busquedaLat: null,
    busquedaLng: null,
    venue: null,
    venueDireccion: null,
    venueFullAddress: null,
    venueLat: null,
    venueLng: null,
    distanciaKm: null,
    duracionMin: null,
  };
}

function toShowDraft(s: GenericShow): ShowDraft {
  return { ...s, key: Math.random().toString(36).slice(2) };
}

export default function HojaGenericaForm({
  hoja,
  onClose,
  onSaved,
}: {
  hoja: HojaGenerica | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [artistName, setArtistName] = useState(hoja?.artistName ?? "");
  const [nombre, setNombre] = useState(hoja?.nombre ?? "");
  const [shows, setShows] = useState<ShowDraft[]>(hoja?.shows.length ? hoja.shows.map(toShowDraft) : [newShow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateShow(key: string, patch: Partial<ShowDraft>) {
    setShows((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }
  function removeShow(key: string) {
    setShows((prev) => prev.filter((s) => s.key !== key));
  }
  function moveShow(key: string, dir: -1 | 1) {
    setShows((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  const canSubmit =
    artistName.trim().length > 0 &&
    shows.length > 0 &&
    shows.every((s) => s.busquedaLat != null && s.busquedaLng != null && s.venueLat != null && s.venueLng != null);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        artistName: artistName.trim(),
        nombre: nombre.trim() || null,
        shows: shows.map(({ key, ...s }) => s),
      };
      const res = await fetch(hoja ? `/api/tourmanager/genericas/${hoja.id}` : "/api/tourmanager/genericas", {
        method: hoja ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div
        className="tm-card"
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", gap: 14, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ fontSize: 17, fontWeight: 700 }}>{hoja ? "Editar hoja genérica" : "Nueva hoja genérica"}</div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Artista">
              <input value={artistName} onChange={(e) => setArtistName(e.target.value)} autoComplete="off" style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Nombre de la gira (opcional)">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Gira México Nov 2026" autoComplete="off" style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shows.map((s, i) => (
            <div key={s.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-color)" }}>Show {i + 1}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => moveShow(s.key, -1)} disabled={i === 0} style={iconBtnStyle}>↑</button>
                  <button type="button" onClick={() => moveShow(s.key, 1)} disabled={i === shows.length - 1} style={iconBtnStyle}>↓</button>
                  <button type="button" onClick={() => removeShow(s.key)} disabled={shows.length === 1} style={iconBtnStyle}>×</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Fecha">
                    <input type="date" value={s.fecha ?? ""} onChange={(e) => updateShow(s.key, { fecha: e.target.value || null })} style={inputStyle} />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Hora del show">
                    <input type="time" value={s.horaShow ?? ""} onChange={(e) => updateShow(s.key, { horaShow: e.target.value || null })} style={inputStyle} />
                  </Field>
                </div>
              </div>
              <AddressField
                label="Búsqueda del artista (de dónde lo levantan)"
                value={s.busquedaDireccion ?? ""}
                onChange={(v) => updateShow(s.key, { busquedaDireccion: v, busquedaLat: null, busquedaLng: null, busquedaFullAddress: null })}
                onResolved={(d) =>
                  updateShow(s.key, d ? { busquedaLat: d.lat, busquedaLng: d.lng, busquedaFullAddress: d.fullAddress } : { busquedaLat: null, busquedaLng: null })
                }
                resolvedAddress={s.busquedaFullAddress}
              />
              <Field label="Venue">
                <input value={s.venue ?? ""} onChange={(e) => updateShow(s.key, { venue: e.target.value })} autoComplete="off" style={inputStyle} />
              </Field>
              <AddressField
                label="Dirección del venue"
                value={s.venueDireccion ?? ""}
                onChange={(v) => updateShow(s.key, { venueDireccion: v, venueLat: null, venueLng: null, venueFullAddress: null })}
                onResolved={(d) => updateShow(s.key, d ? { venueLat: d.lat, venueLng: d.lng, venueFullAddress: d.fullAddress } : { venueLat: null, venueLng: null })}
                resolvedAddress={s.venueFullAddress}
              />
              {s.distanciaKm != null && (
                <div style={{ fontSize: 11, color: "var(--good-ink)" }}>
                  Recorrido guardado: {s.distanciaKm} km · {s.duracionMin} min
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShows((prev) => [...prev, newShow()])}
          style={{ background: "transparent", border: "1px dashed var(--line-soft)", borderRadius: 8, padding: "9px 0", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}
        >
          + Agregar show
        </button>

        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              background: "var(--accent-gradient)",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              color: "var(--accent-ink)",
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "default",
              opacity: canSubmit ? 1 : 0.4,
              fontSize: 13.5,
            }}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
        {!canSubmit && <div style={{ fontSize: 11.5, color: "var(--text-3)", textAlign: "right" }}>Completá artista y resolvé búsqueda + venue de cada show para guardar.</div>}
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  width: 26,
  height: 26,
  color: "var(--text-2)",
  cursor: "pointer",
  fontSize: 13,
};
