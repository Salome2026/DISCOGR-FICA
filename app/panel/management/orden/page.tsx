"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { ManagementShell } from "../_shared";

type ManagementArtistRow = {
  id: string;
  name: string;
  sello: string | null;
  photoUrl: string | null;
  chartPosition: number | null;
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="mgord-avatar-img" />;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return <div className="mgord-avatar-fallback">{initials || "?"}</div>;
}

export default function ManagementOrdenPage() {
  const [positioned, setPositioned] = useState<ManagementArtistRow[] | null>(null);
  const [unpositioned, setUnpositioned] = useState<ManagementArtistRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/management/artists")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        const all: ManagementArtistRow[] = d.artists;
        setPositioned(all.filter((a) => a.chartPosition != null));
        setUnpositioned(all.filter((a) => a.chartPosition == null));
      })
      .catch((e) => setError(String(e)));
  }, []);

  function move(index: number, dir: -1 | 1) {
    if (!positioned) return;
    const next = [...positioned];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPositioned(next);
    setSaved(false);
  }

  function addToOrder(artist: ManagementArtistRow) {
    if (!positioned) return;
    setPositioned([...positioned, artist]);
    setUnpositioned(unpositioned.filter((a) => a.id !== artist.id));
    setSaved(false);
  }

  async function handleSave() {
    if (!positioned) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/management/artists/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: positioned.map((a) => ({ id: a.id, name: a.name, sello: a.sello })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el orden.");
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireRole allow={["management"]}>
      <ManagementShell title="Orden del ranking" backHref="/panel/management">
        <style>{`
          .mgord-list { display: flex; flex-direction: column; gap: 10px; }
          .mgord-row { display: flex; align-items: center; gap: 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: .9rem 1.1rem; }
          .mgord-pos { font-size: 14px; font-weight: 700; color: var(--text-2); width: 32px; text-align: center; flex-shrink: 0; }
          .mgord-avatar-img { width: 38px; height: 38px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
          .mgord-avatar-fallback { width: 38px; height: 38px; border-radius: 10px; background: var(--accent-gradient); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
          .mgord-name { font-size: 14.5px; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mgord-meta { font-size: 12px; color: var(--text-3); }
          .mgord-arrows { display: flex; gap: 6px; }
          .mgord-arrow-btn { background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; width: 34px; height: 34px; color: var(--text-1); cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; }
          .mgord-arrow-btn:disabled { opacity: .35; cursor: default; }
          .mgord-arrow-btn:hover:not(:disabled) { border-color: var(--accent-color-glow); }
          .mgord-add-btn { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 7px 14px; color: var(--text-2); cursor: pointer; font-size: 12.5px; }
          .mgord-add-btn:hover { border-color: var(--accent-color-glow); color: var(--text-1); }
          .mgord-save-bar { display: flex; align-items: center; gap: 14px; margin-top: 1.5rem; }
          .mgord-btn-primary { background: var(--accent-gradient); border: none; border-radius: 8px; padding: 11px 20px; color: var(--accent-ink); font-weight: 700; cursor: pointer; font-size: 13.5px; }
          .mgord-saved-msg { font-size: 13px; color: var(--text-2); }
          .mgord-empty { color: var(--text-3); font-size: 13.5px; padding: 1rem 0; }
        `}</style>

        {error && <p className="mgord-empty">Error: {error}</p>}
        {positioned === null && !error && <p className="mgord-empty">Cargando...</p>}

        {positioned !== null && (
          <>
            <div className="mgmt-section">
              <div className="mgmt-section-label">Ranking actual — usá las flechas para reordenar</div>
              {positioned.length === 0 ? (
                <p className="mgord-empty">Ningún artista tiene posición asignada todavía.</p>
              ) : (
                <div className="mgord-list">
                  {positioned.map((a, i) => (
                    <div key={a.id} className="mgord-row">
                      <span className="mgord-pos">#{i + 1}</span>
                      <Avatar name={a.name} url={a.photoUrl} />
                      <span className="mgord-name">{a.name}</span>
                      <span className="mgord-meta">{a.sello || "Sin sello"}</span>
                      <div className="mgord-arrows">
                        <button className="mgord-arrow-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                          ▲
                        </button>
                        <button className="mgord-arrow-btn" onClick={() => move(i, 1)} disabled={i === positioned.length - 1} aria-label="Bajar">
                          ▼
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mgmt-section">
              <div className="mgmt-section-label">Sin posición</div>
              {unpositioned.length === 0 ? (
                <p className="mgord-empty">Todos los artistas tienen una posición asignada.</p>
              ) : (
                <div className="mgord-list">
                  {unpositioned.map((a) => (
                    <div key={a.id} className="mgord-row">
                      <Avatar name={a.name} url={a.photoUrl} />
                      <span className="mgord-name">{a.name}</span>
                      <span className="mgord-meta">{a.sello || "Sin sello"}</span>
                      <button className="mgord-add-btn" onClick={() => addToOrder(a)}>
                        + Agregar al ranking
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mgord-save-bar">
              <button className="mgord-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar orden"}
              </button>
              {saved && <span className="mgord-saved-msg">Orden guardado.</span>}
            </div>
          </>
        )}
      </ManagementShell>
    </RequireRole>
  );
}
