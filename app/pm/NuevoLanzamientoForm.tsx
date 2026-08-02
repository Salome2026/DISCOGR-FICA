"use client";

import { useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import catalogo from "@/data/catalogo.json";
import porCompania from "@/data/por_compania.json";
import { assignSello, SELLOS } from "@/lib/sellos";

type ArtistEntry = { artist: string };
const catalogoData = catalogo as ArtistEntry[];
const distribuidoras = [
  ...(porCompania as { companies: { company: string }[] }).companies
    .map((c) => c.company)
    .filter((c) => c !== "Sin datos"),
  "Sin definir",
];

const ESTADOS = ["Contactado", "Firmado", "Necesito ayuda"] as const;
const PORTADA_SIZE = 3000;

type Props = {
  role: "admin" | "project_manager";
  assignedArtists: string[] | null; // null = admin, sees all
  onClose: () => void;
  onCreated: () => void;
};

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

export default function NuevoLanzamientoForm({ role, assignedArtists, onClose, onCreated }: Props) {
  const [artistQuery, setArtistQuery] = useState("");
  const [artist, setArtist] = useState<string | null>(null);
  const [sello, setSello] = useState("");
  const [selloTouched, setSelloTouched] = useState(false);
  const [fonograma, setFonograma] = useState("");
  const [autores, setAutores] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("Contactado");
  const [distribuidora, setDistribuidora] = useState("");
  const [fecha, setFecha] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [portadaFile, setPortadaFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
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

  function selectArtist(a: string) {
    setArtist(a);
    setArtistQuery(a);
    if (!selloTouched) {
      const suggested = assignSello(a);
      if (suggested) setSello(suggested);
    }
  }

  async function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setAudioFile(null);
      return;
    }
    const isWav = f.type === "audio/wav" || f.type === "audio/x-wav" || /\.wav$/i.test(f.name);
    if (!isWav) {
      setFileError("El audio tiene que ser un archivo .wav.");
      e.target.value = "";
      setAudioFile(null);
      return;
    }
    setAudioFile(f);
  }

  async function handlePortadaChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setPortadaFile(null);
      return;
    }
    try {
      const { width, height } = await imageDimensions(f);
      if (width !== PORTADA_SIZE || height !== PORTADA_SIZE) {
        setFileError(`La portada tiene que ser exactamente ${PORTADA_SIZE}x${PORTADA_SIZE}px (subiste ${width}x${height}px).`);
        e.target.value = "";
        setPortadaFile(null);
        return;
      }
      setPortadaFile(f);
    } catch {
      setFileError("No se pudo leer la imagen. Probá con otro archivo.");
      e.target.value = "";
      setPortadaFile(null);
    }
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
    if (!sello) {
      setError("Elegí el sello / unidad de negocio.");
      return;
    }

    setSaving(true);
    try {
      let audioUrl: string | null = null;
      let portadaUrl: string | null = null;

      if (audioFile) {
        setUploadStep("Subiendo audio...");
        const blob = await upload(audioFile.name, audioFile, {
          access: "public",
          handleUploadUrl: "/api/pm/upload",
          clientPayload: "audio",
        });
        audioUrl = blob.url;
      }
      if (portadaFile) {
        setUploadStep("Subiendo portada...");
        const blob = await upload(portadaFile.name, portadaFile, {
          access: "public",
          handleUploadUrl: "/api/pm/upload",
          clientPayload: "portada",
        });
        portadaUrl = blob.url;
      }
      setUploadStep(null);

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
          autoresCompositores: autores || null,
          audioUrl,
          portadaUrl,
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
      setUploadStep(null);
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
        overflowY: "auto",
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
          maxHeight: "90vh",
          overflowY: "auto",
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
          <select
            value={sello}
            onChange={(e) => {
              setSello(e.target.value);
              setSelloTouched(true);
            }}
            style={inputStyle}
          >
            <option value="">Elegir...</option>
            {SELLOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Autores y compositores</label>
          <input
            value={autores}
            onChange={(e) => setAutores(e.target.value)}
            placeholder="Nombre y apellido de cada uno, separados por coma"
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

        <div>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>Audio (.wav)</label>
          <input type="file" accept=".wav,audio/wav" onChange={handleAudioChange} style={fileInputStyle} />
          {audioFile && (
            <p style={{ fontSize: 11.5, color: "#7fae6f", marginTop: 4 }}>✓ {audioFile.name}</p>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12.5, color: "#c2b39a" }}>
            Portada ({PORTADA_SIZE}x{PORTADA_SIZE}px, para Spotify)
          </label>
          <input type="file" accept="image/png,image/jpeg" onChange={handlePortadaChange} style={fileInputStyle} />
          {portadaFile && (
            <p style={{ fontSize: 11.5, color: "#7fae6f", marginTop: 4 }}>✓ {portadaFile.name}</p>
          )}
        </div>

        {fileError && (
          <div style={{ background: "#3d2a24", color: "#eab3a8", padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>
            {fileError}
          </div>
        )}
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
            {saving ? uploadStep ?? "Guardando..." : "Guardar lanzamiento"}
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

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "6px 8px",
};
