"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import { GENEROS } from "@/lib/genres";

type ManagementArtistRow = {
  id: string;
  name: string;
  sello: string | null;
  photoUrl: string | null;
  chartPosition: number | null;
  estadoGeneral: string | null;
  genero: string | null;
  notas: string | null;
  monthlyListeners: number | null;
  nextRelease: { titulo: string; fecha: string; hora: string | null; estado: string } | null;
};

const ESTADO_OPTIONS = ["Activo", "Prioridad", "En pausa", "Baja"];

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="mgrid-avatar-img" />;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return <div className="mgrid-avatar-fallback">{initials || "?"}</div>;
}

export default function ArtistGrid() {
  const [artists, setArtists] = useState<ManagementArtistRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagementArtistRow | null>(null);

  const [query, setQuery] = useState("");
  const [selloFilter, setSelloFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [generoFilter, setGeneroFilter] = useState("");
  const [proximoFilter, setProximoFilter] = useState<"" | "con" | "sin">("");
  const [sortMode, setSortMode] = useState<"ranking" | "oyentes" | "nombre">("ranking");

  function reload() {
    fetch("/api/management/artists")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setArtists(d.artists);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(reload, []);

  const selloOptions = useMemo(() => {
    if (!artists) return [];
    const set = new Set<string>();
    for (const a of artists) if (a.sello) set.add(a.sello);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [artists]);

  const generoOptions = useMemo(() => {
    if (!artists) return [];
    const set = new Set<string>();
    for (const a of artists) if (a.genero) set.add(a.genero);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [artists]);

  const filtered = useMemo(() => {
    if (!artists) return [];
    const q = query.trim().toLowerCase();
    return artists.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (selloFilter && a.sello !== selloFilter) return false;
      if (estadoFilter && a.estadoGeneral !== estadoFilter) return false;
      if (generoFilter && a.genero !== generoFilter) return false;
      if (proximoFilter === "con" && !a.nextRelease) return false;
      if (proximoFilter === "sin" && a.nextRelease) return false;
      return true;
    });
  }, [artists, query, selloFilter, estadoFilter, generoFilter, proximoFilter]);

  // "Ranking" (the default) returns the filtered set untouched — i.e. in the
  // exact order the API returned it, which is the fixed, manually-curated
  // chart position. The other modes are a temporary, display-only reorder of
  // whatever's currently filtered; neither ever writes back to chartPosition
  // — the persisted ranking only ever changes via /panel/management/orden.
  const visibleArtists = useMemo(() => {
    if (sortMode === "ranking") return filtered;
    const copy = [...filtered];
    if (sortMode === "oyentes") copy.sort((a, b) => (b.monthlyListeners ?? -1) - (a.monthlyListeners ?? -1));
    else if (sortMode === "nombre") copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return copy;
  }, [filtered, sortMode]);

  return (
    <div className="mgmt-section">
      <style>{`
        .mgrid-toolbar { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 14px 16px; margin-bottom: 1.25rem; backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); box-shadow: var(--shadow-glass); }
        .mgrid-search { flex: 1; min-width: 200px; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 12px; color: var(--text-1); font-size: 13px; font-family: inherit; }
        .mgrid-toolbar select { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 8px 12px; color: var(--text-1); font-size: 12.5px; font-family: inherit; }

        .mgrid-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; }
        .mgrid-card { position: relative; display: flex; flex-direction: column; gap: 10px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.25rem; color: var(--text-1); box-shadow: var(--shadow-glass); backdrop-filter: blur(var(--glass-blur)) saturate(1.7); -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.7); transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
        .mgrid-card:hover { transform: translateY(-2px); border-color: var(--accent-color-glow); }
        .mgrid-card.mgrid-card-upcoming { border-color: #e5484d; border-width: 2px; background: rgba(229, 72, 77, 0.16); box-shadow: var(--shadow-glass), 0 0 0 1px rgba(229, 72, 77, 0.25); }
        .mgrid-card.mgrid-card-upcoming:hover { border-color: #ff5b60; }
        .mgrid-card-link { display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; }
        .mgrid-avatar-img { width: 46px; height: 46px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
        .mgrid-avatar-fallback { width: 46px; height: 46px; border-radius: 12px; background: var(--accent-gradient); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
        .mgrid-card-name { font-size: 16px; font-weight: 700; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mgrid-card-meta { font-size: 13.5px; font-weight: 500; color: var(--text-2); line-height: 1.4; margin-top: 3px; }
        .mgrid-badge { position: absolute; top: 12px; right: 12px; font-size: 11px; font-weight: 700; color: var(--text-2); background: var(--bg-2); border: 1px solid var(--glass-border); border-radius: 100px; padding: 2px 9px; }
        .mgrid-card-foot { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 500; color: var(--text-2); line-height: 1.45; margin-top: auto; }
        .mgrid-estado { align-self: flex-start; font-size: 12px; font-weight: 700; padding: 4px 11px; border-radius: 100px; background: var(--bg-2); border: 1px solid var(--glass-border); color: var(--text-1); }
        .mgrid-edit-btn { align-self: flex-start; background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 6px 12px; color: var(--text-2); cursor: pointer; font-size: 12px; }
        .mgrid-edit-btn:hover { border-color: var(--accent-color-glow); color: var(--text-1); }
        .mgrid-empty { color: var(--text-3); font-size: 13.5px; padding: 2rem 0; text-align: center; }
        .mgrid-section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .mgrid-orden-link { font-size: 12.5px; color: var(--text-2); text-decoration: none; border: 1px solid var(--line-soft); border-radius: 8px; padding: 6px 12px; }
        .mgrid-orden-link:hover { border-color: var(--accent-color-glow); color: var(--text-1); }

        .mgrid-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 2rem; overflow-y: auto; }
        .mgrid-modal { background: var(--glass-bg-strong); backdrop-filter: blur(40px) saturate(1.7); -webkit-backdrop-filter: blur(40px) saturate(1.7); color: var(--text-1); border-radius: 16px; border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass-lg); width: 100%; max-width: 420px; padding: 1.6rem; display: flex; flex-direction: column; gap: 14px; }
        .mgrid-modal h2 { font-size: 18px; font-weight: 700; margin: 0; }
        .mgrid-field { display: flex; flex-direction: column; gap: 6px; }
        .mgrid-field label { font-size: 12px; color: var(--text-3); }
        .mgrid-field select, .mgrid-field input, .mgrid-field textarea { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 11px; color: var(--text-1); font-size: 13.5px; font-family: inherit; resize: vertical; }
        .mgrid-modal-photo { display: flex; align-items: center; gap: 14px; }
        .mgrid-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .mgrid-btn-primary { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 9px 16px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13px; }
        .mgrid-btn-ghost { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 9px 14px; color: var(--text-2); cursor: pointer; font-size: 13px; }
      `}</style>

      <div className="mgrid-toolbar">
        <input
          className="mgrid-search"
          type="text"
          placeholder="Buscar por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={selloFilter} onChange={(e) => setSelloFilter(e.target.value)}>
          <option value="">Todos los sellos</option>
          {selloOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADO_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={generoFilter} onChange={(e) => setGeneroFilter(e.target.value)}>
          <option value="">Todos los géneros</option>
          {generoOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select value={proximoFilter} onChange={(e) => setProximoFilter(e.target.value as "" | "con" | "sin")}>
          <option value="">Lanzamiento — todos</option>
          <option value="con">Con próximo lanzamiento</option>
          <option value="sin">Sin próximo lanzamiento</option>
        </select>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as "ranking" | "oyentes" | "nombre")}>
          <option value="ranking">Ordenar por: Ranking (posición fija)</option>
          <option value="oyentes">Ordenar por: Oyentes mensuales</option>
          <option value="nombre">Ordenar por: Nombre</option>
        </select>
      </div>

      <div className="mgrid-section-head">
        <div className="mgmt-section-label">Roster</div>
        <Link href="/panel/management/orden" className="mgrid-orden-link">
          Editar orden
        </Link>
      </div>

      {error && <p className="mgrid-empty">Error: {error}</p>}
      {artists === null && !error && <p className="mgrid-empty">Cargando artistas...</p>}
      {artists !== null && artists.length === 0 && <p className="mgrid-empty">No hay artistas todavía.</p>}
      {artists !== null && artists.length > 0 && visibleArtists.length === 0 && (
        <p className="mgrid-empty">Ningún artista coincide con los filtros.</p>
      )}

      {visibleArtists.length > 0 && (
        <div className="mgrid-grid">
          {/* Default view ("Ranking") preserves the exact order returned by the
              API — the fixed, manually-curated chart position ranking. The
              "Ordenar por" control lets a user temporarily reorder the
              *currently filtered* view (by monthly listeners or name) for
              browsing purposes only — it never writes back to chartPosition;
              the persisted ranking is only ever changed via
              /panel/management/orden. */}
          {visibleArtists.map((a) => (
            <div key={a.id} className={`mgrid-card${a.nextRelease ? " mgrid-card-upcoming" : ""}`}>
              {a.chartPosition != null && <span className="mgrid-badge">#{a.chartPosition}</span>}
              <Link href={`/artistas/${encodeURIComponent(a.name)}`} className="mgrid-card-link">
                <Avatar name={a.name} url={a.photoUrl} />
                <div style={{ minWidth: 0 }}>
                  <div className="mgrid-card-name">{a.name}</div>
                  <div className="mgrid-card-meta">{a.sello || "Sin sello"}</div>
                </div>
              </Link>
              <div className="mgrid-card-foot">
                <span>{a.monthlyListeners != null ? `${a.monthlyListeners.toLocaleString("es-AR")} oyentes/mes` : "Sin datos de oyentes"}</span>
              </div>
              {a.estadoGeneral && <span className="mgrid-estado">{a.estadoGeneral}</span>}
              <button className="mgrid-edit-btn" onClick={() => setEditing(a)}>
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditArtistModal
          artist={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function EditArtistModal({
  artist,
  onClose,
  onSaved,
}: {
  artist: ManagementArtistRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState(artist.photoUrl);
  const [estadoGeneral, setEstadoGeneral] = useState(artist.estadoGeneral ?? "");
  const [genero, setGenero] = useState(() =>
    artist.genero && GENEROS.includes(artist.genero) ? artist.genero : artist.genero ? "Otro" : ""
  );
  const [otroGenero, setOtroGenero] = useState(() =>
    artist.genero && !GENEROS.includes(artist.genero) ? artist.genero : ""
  );
  const [notas, setNotas] = useState(artist.notas ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoChange(file: File) {
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/management/upload",
      });
      setPhotoUrl(blob.url);
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const submittedGenero = genero === "Otro" ? otroGenero.trim() || null : genero || null;
      const res = await fetch(`/api/management/artists/${encodeURIComponent(artist.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: artist.name,
          photoUrl,
          estadoGeneral: estadoGeneral || null,
          genero: submittedGenero,
          notas: notas.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <div className="mgrid-modal-overlay" onClick={onClose}>
      <form className="mgrid-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{artist.name}</h2>

        <div className="mgrid-modal-photo">
          <Avatar name={artist.name} url={photoUrl} />
          <div className="mgrid-field" style={{ flex: 1 }}>
            <label>Foto</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoChange(f);
              }}
              disabled={uploading}
            />
            {uploading && <span style={{ fontSize: 12, color: "var(--text-3)" }}>Subiendo...</span>}
          </div>
        </div>

        <div className="mgrid-field">
          <label>Estado general</label>
          <select value={estadoGeneral} onChange={(e) => setEstadoGeneral(e.target.value)}>
            <option value="">Sin estado</option>
            {ESTADO_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="mgrid-field">
          <label>Género</label>
          <select value={genero} onChange={(e) => setGenero(e.target.value)}>
            <option value="">Sin género</option>
            {GENEROS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        {genero === "Otro" && (
          <div className="mgrid-field">
            <label>¿Qué género es?</label>
            <input
              value={otroGenero}
              onChange={(e) => setOtroGenero(e.target.value)}
              placeholder="Ej: Bachata, Corridos, R&B..."
            />
          </div>
        )}

        <div className="mgrid-field">
          <label>Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas internas sobre este artista..."
            rows={4}
          />
        </div>

        {error && <p style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</p>}

        <div className="mgrid-modal-actions">
          <button type="button" className="mgrid-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="mgrid-btn-primary" disabled={saving || uploading}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
