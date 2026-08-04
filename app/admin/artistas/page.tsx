"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/app/components/RequireRole";
import { SELLOS } from "@/lib/sellos";

type Artist = {
  id: string;
  name: string;
  aliases: string[];
  sello: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  spotify: string | null;
  chartmetricId: number | null;
  updatedAt: string | null;
};

export default function AdminArtistas() {
  return (
    <RequireRole allow={["admin"]}>
      <AdminArtistasInner />
    </RequireRole>
  );
}

function AdminArtistasInner() {
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Artist | "new" | null>(null);
  const [filter, setFilter] = useState("");

  function load() {
    fetch("/api/artists")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setArtists(d.artists)))
      .catch((e) => setError(String(e)));
  }

  useEffect(load, []);

  const visible = artists?.filter((a) => a.name.toLowerCase().includes(filter.toLowerCase())) ?? [];

  return (
    <div className="dash-root bg-atmosphere">
      <style>{`
        .dash-root { font-family: var(--font-display); color:var(--text-1); min-height:100vh; padding-bottom:5rem; }
        .inner{max-width:1100px;margin:0 auto;padding:2.5rem 2rem 0;}
        .crumb{font-size:13px;color:var(--text-3);margin-bottom:1.25rem;}
        .crumb a{color:var(--text-2);text-decoration:none;}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;gap:12px;flex-wrap:wrap;}
        .btn-primary{background:var(--accent-glass-bg);border:1px solid var(--accent-glass-border);border-radius:8px;padding:10px 18px;color:var(--text-1);font-weight:600;cursor:pointer;font-size:13.5px;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);}
        .btn-ghost{background:transparent;border:1px solid var(--line-soft);border-radius:8px;padding:6px 12px;color:var(--text-2);cursor:pointer;font-size:12px;}
        .card{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:1.5rem;backdrop-filter:blur(var(--glass-blur)) saturate(1.7);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(1.7);box-shadow:var(--shadow-glass);}
        table{width:100%;border-collapse:collapse;font-size:12.5px;}
        th{text-align:left;color:var(--text-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line-soft);white-space:nowrap;}
        td{padding:8px 10px;border-bottom:1px solid var(--line-soft);}
        .muted{color:var(--text-3);}
        .search-input{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:9px 12px;color:var(--text-1);font-size:13px;min-width:220px;}
        .dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:6px;}
      `}</style>
      <div className="inner">
        <div className="crumb">
          <Link href="/dashboard">Dashboard</Link> › Artistas
        </div>
        <div className="topbar">
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>Artistas</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="search-input"
              placeholder="Buscar artista..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button className="btn-primary" onClick={() => setEditing("new")}>
              + Nuevo artista
            </button>
          </div>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: -4, marginBottom: 16 }}>
          Redes oficiales de cada artista del sello, usadas para autocompletar el Plan de Marketing con IA
          sin tener que salir de la plataforma a buscar links.
        </p>

        {error && (
          <div style={{ background: "var(--crit-bg)", color: "var(--crit-ink)", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="card">
          {!artists ? (
            <p className="muted">Cargando...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Artista</th>
                  <th>Sello</th>
                  <th>Instagram</th>
                  <th>TikTok</th>
                  <th>YouTube</th>
                  <th>Spotify</th>
                  <th>Chartmetric ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => {
                  const completeness = [a.instagram, a.tiktok, a.youtube, a.spotify].filter(Boolean).length;
                  return (
                    <tr key={a.id}>
                      <td>
                        <span
                          className="dot"
                          style={{ background: completeness === 0 ? "var(--crit-ink)" : completeness < 2 ? "var(--warn-ink)" : "var(--good-ink)" }}
                        />
                        {a.name}
                      </td>
                      <td className="muted">{a.sello ?? "—"}</td>
                      <td className="muted">{a.instagram ? "✓" : "—"}</td>
                      <td className="muted">{a.tiktok ? "✓" : "—"}</td>
                      <td className="muted">{a.youtube ? "✓" : "—"}</td>
                      <td className="muted">{a.spotify ? "✓" : "—"}</td>
                      <td className="muted">{a.chartmetricId ?? "—"}</td>
                      <td>
                        <button className="btn-ghost" onClick={() => setEditing(a)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>
                      Sin resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <ArtistForm
          artist={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ArtistForm({
  artist,
  onClose,
  onSaved,
}: {
  artist: Artist | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(artist?.name ?? "");
  const [aliases, setAliases] = useState(artist?.aliases.join(", ") ?? "");
  const [sello, setSello] = useState(artist?.sello ?? "");
  const [instagram, setInstagram] = useState(artist?.instagram ?? "");
  const [tiktok, setTiktok] = useState(artist?.tiktok ?? "");
  const [youtube, setYoutube] = useState(artist?.youtube ?? "");
  const [spotify, setSpotify] = useState(artist?.spotify ?? "");
  const [chartmetricId, setChartmetricId] = useState(artist?.chartmetricId?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: artist?.id,
          name, aliases, sello: sello || null,
          instagram, tiktok, youtube, spotify, chartmetricId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", overflowY: "auto" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ background: "var(--glass-bg-strong)", backdropFilter: "blur(40px) saturate(1.7)", WebkitBackdropFilter: "blur(40px) saturate(1.7)", color: "var(--text-1)", borderRadius: 16, border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-glass-lg)", width: "100%", maxWidth: 440, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>{artist ? "Editar artista" : "Nuevo artista"}</div>

        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        </Field>
        <Field label="Alias (separados por coma, opcional)">
          <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Ej: Nico Mattioli, Nico M" style={inputStyle} />
        </Field>
        <Field label="Sello">
          <select value={sello} onChange={(e) => setSello(e.target.value)} style={inputStyle}>
            <option value="">Sin asignar / distribución</option>
            {SELLOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Instagram (link completo)">
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." style={inputStyle} />
        </Field>
        <Field label="TikTok (link completo)">
          <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@..." style={inputStyle} />
        </Field>
        <Field label="YouTube (link completo)">
          <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@..." style={inputStyle} />
        </Field>
        <Field label="Spotify (link completo)">
          <input value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/artist/..." style={inputStyle} />
        </Field>
        <Field label="Chartmetric ID (opcional, acelera la sync)">
          <input value={chartmetricId} onChange={(e) => setChartmetricId(e.target.value)} placeholder="Ej: 1234567" style={inputStyle} />
        </Field>

        {error && <div style={{ color: "var(--crit-ink)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "8px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ background: "var(--accent-glass-bg)", border: "1px solid var(--accent-glass-border)", borderRadius: 8, padding: "8px 16px", color: "var(--text-1)", fontWeight: 600, cursor: "pointer", fontSize: 13, backdropFilter: "blur(20px) saturate(1.7)", WebkitBackdropFilter: "blur(20px) saturate(1.7)" }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>{label}</label>
      {children}
    </div>
  );
}

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
