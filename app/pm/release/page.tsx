"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { PMShell } from "../_shared";

const RPX_STYLES = `
  .rpx-search { width:100%; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:10px 14px; color:var(--text-1); font-size:13.5px; }
  .rpx-list { display:flex; flex-direction:column; gap:8px; margin-top:14px; }
  .rpx-item { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--bg-2); border:1px solid var(--line-soft); border-radius:8px; padding:12px 14px; cursor:pointer; }
  .rpx-item:hover { border-color:var(--accent-color); }
  .rpx-item-title { font-size:14px; font-weight:700; }
  .rpx-item-meta { font-size:12px; color:var(--text-3); margin-top:2px; }
  .rpx-empty { color:var(--text-3); font-size:13.5px; padding:1rem 0; text-align:center; }
  .rpx-manual-link { background:none; border:none; cursor:pointer; text-decoration:underline; padding:0; }
`;

type Release = {
  id: number;
  artist_name: string;
  sello: string | null;
  fonograma_nombre: string;
  fecha_lanzamiento: string | null;
  group_id: number | null;
  group_tipo: string | null;
  group_nombre: string | null;
};

function formatFecha(v: string | null): string {
  if (!v) return "—";
  return v.slice(0, 10);
}

export default function ReleasePickerPage() {
  return (
    <RequireRole allow={["admin", "project_manager"]}>
      <PMShell title="Release" subtitle="Elegí el fonograma para cargar sus datos de derechos de máster." backHref="/pm">
        <ReleasePicker />
      </PMShell>
    </RequireRole>
  );
}

function ReleasePicker() {
  const router = useRouter();
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/pm/releases")
      .then((r) => r.json())
      .then((d) => setReleases(d.releases ?? []));
  }, []);

  const visible = useMemo(() => {
    if (!releases) return [];
    const query = q.trim().toLowerCase();
    if (!query) return releases;
    return releases.filter(
      (r) =>
        r.fonograma_nombre.toLowerCase().includes(query) ||
        r.artist_name.toLowerCase().includes(query) ||
        (r.group_nombre ?? "").toLowerCase().includes(query)
    );
  }, [releases, q]);

  return (
    <div className="pmx-card">
      <style>{RPX_STYLES}</style>
      <input
        className="rpx-search"
        placeholder="Buscá por fonograma o artista..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {!releases ? (
        <p style={{ color: "var(--text-3)", marginTop: 14 }}>Cargando fonogramas...</p>
      ) : visible.length === 0 ? (
        <div className="rpx-empty">
          {q ? "No encontramos ningún fonograma con esa búsqueda." : "Todavía no cargaste ningún fonograma."}
        </div>
      ) : (
        <div className="rpx-list">
          {visible.map((r) => (
            <div key={r.id} className="rpx-item" onClick={() => router.push(`/pm/fonograma/${r.id}/release`)}>
              <div>
                <div className="rpx-item-title">{r.fonograma_nombre}</div>
                <div className="rpx-item-meta">
                  {r.artist_name}
                  {r.sello ? ` · ${r.sello}` : ""} · {formatFecha(r.fecha_lanzamiento)}
                  {r.group_tipo && ` · ${r.group_tipo === "ep" ? "EP" : "Álbum"}: ${r.group_nombre}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="rpx-manual-link"
        style={{ marginTop: 14, fontSize: 15, color: "#fff", fontWeight: 600 }}
        onClick={() => router.push("/pm/fonograma/nuevo/release")}
      >
        Todavía no tengo el fonograma cargado — cargar los datos a mano
      </button>
    </div>
  );
}
