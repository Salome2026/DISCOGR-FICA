"use client";

import { useMemo, useState } from "react";
import catalogo from "@/data/catalogo.json";
import porCompania from "@/data/por_compania.json";
import { assignSello } from "@/lib/sellos";

type ArtistEntry = { artist: string };
const catalogoData = catalogo as ArtistEntry[];
const distribuidoras = [
  ...(porCompania as { companies: { company: string }[] }).companies
    .map((c) => c.company)
    .filter((c) => c !== "Sin datos"),
  "Sin definir",
];

const ESTADOS = ["Contactado", "Firmado", "Necesito ayuda"] as const;

type Props = {
  role: "admin" | "project_manager";
  assignedArtists: string[] | null; // null = admin, sees all
  onClose: () => void;
  onCreated: () => void;
};

export default function NuevoLanzamientoForm({ role, assignedArtists, onClose, onCreated }: Props) {
  const [artistQuery, setArtistQuery] = useState("");
  const [artist, setArtist] = useState<string | null>(null);
  const [fonograma, setFonograma] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("Contactado");
  const [distribuidora, setDistribuidora] = useState("");
  const [fecha, setFecha] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const artistPool = useMemo(() => {
    const names = catalogoData.map((a) => a.artist).filter((a) => a && a !== "Sin artista");
    if (role === "admin" || !assignedArtists) return names;
    const allowed = new Set(assignedArtists.map((a) => a.toLowerCase()));
    return names.filter((n) => allowed.has(n.toLowerCase()));
  }, [role, assignedArtists]);

  const suggestions = useMemo(() => {
    if (!artistQuery.trim()) return [];
    const q = artistQuery.toLowerCase();
    return artistPool.filter((a) => a.toLowerCase().includes(q)).slice(0, 8);
  }, [artistQuery, artistPool]);

  const sello = artist ? assignSello(artist) : null;

  function selectArtist(a: string) {
    setArtist(a);
    setArtistQuery(a);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!artist) {
      setError("Elegí un artista de la lista (buscá y hacé click en una sugerencia).");
      return;
    }
    if (!fonograma.trim()) {
      setError("El nombre del fonograma es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pm/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist,
          sello,
          fonograma,
          estado,
          distribuidora: distribuidora || null,
          fecha: fecha || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar.");
      }
      setSuccess(true);
      setTimeout(() => {
        onCreated();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: "#1c1712",
          color: "#f4ede1",
          borderRadius: 16,
          border: "1px solid #403627",
          width: "100%",
          maxWidth: 480,
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>+ Nuevo lanzamiento</div>

        <div style={{ position: "relative" }}>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Artista</label>
          <input
            value={artistQuery}
            onChange={(e) => {
              setArtistQuery(e.target.value);
              setArtist(null);
            }}
            placeholder="Buscar artista..."
            style={inputStyle}
          />
          {suggestions.length > 0 && !artist && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#242019",
                border: "1px solid #403627",
                borderRadius: 8,
                marginTop: 4,
                maxHeight: 180,
                overflowY: "auto",
                zIndex: 10,
              }}
            >
              {suggestions.map((s) => (
                <div
                  key={s}
                  onClick={() => selectArtist(s)}
                  style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
          {artistQuery && suggestions.length === 0 && !artist && (
            <p style={{ fontSize: 12, color: "#8f8267", marginTop: 4 }}>
              Sin coincidencias entre tus artistas asignados.
            </p>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Sello / unidad de negocio</label>
          <input value={sello ?? "Sin asignar"} disabled style={{ ...inputStyle, opacity: 0.6 }} />
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Nombre del fonograma</label>
          <input
            value={fonograma}
            onChange={(e) => setFonograma(e.target.value)}
            placeholder="Nombre del single / EP / álbum"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Estado del release</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} style={inputStyle}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Distribuidora</label>
          <select
            value={distribuidora}
            onChange={(e) => setDistribuidora(e.target.value)}
            style={inputStyle}
          >
            <option value="">Elegir...</option>
            {distribuidoras.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Fecha de lanzamiento</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
        </div>

        {error && (
          <div style={{ background: "#3d2a24", color: "#eab3a8", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "#3a4032", color: "#d3e6c9", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
            Lanzamiento guardado correctamente.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #403627",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#c2b39a",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#e6a94f",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#3a2b0f",
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              fontSize: 13,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Guardando..." : "Guardar lanzamiento"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#242019",
  border: "1px solid #403627",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#f4ede1",
  fontSize: 13,
  marginTop: 4,
};
