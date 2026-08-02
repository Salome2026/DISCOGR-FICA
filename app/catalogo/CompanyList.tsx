"use client";

import { useMemo, useState } from "react";
import porCompania from "@/data/por_compania.json";

type Track = {
  artist: string;
  track: string;
  isrc: string;
  album: string;
  release_date: string;
  upc: string;
  type: string;
};

type CompanyEntry = {
  company: string;
  count: number;
  pct: number;
  tracks: Track[];
};

const data = porCompania as { total: number; companies: CompanyEntry[] };

function matches(t: Track, q: string) {
  const s = q.toLowerCase();
  return (
    t.artist.toLowerCase().includes(s) ||
    t.track.toLowerCase().includes(s) ||
    t.album.toLowerCase().includes(s) ||
    t.isrc.toLowerCase().includes(s)
  );
}

export default function CompanyList() {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim();
  const filtered = useMemo(() => {
    if (!q) return null;
    return data.companies
      .map((c) => ({ ...c, tracks: c.tracks.filter((t) => matches(t, q)) }))
      .filter((c) => c.tracks.length > 0);
  }, [q]);

  const list = filtered ?? data.companies;
  const totalMatches = filtered
    ? filtered.reduce((a, c) => a + c.tracks.length, 0)
    : null;

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por artista, track, álbum o ISRC..."
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
        {filtered && (
          <p className="text-xs text-gray-500 mt-1">
            {totalMatches} resultado{totalMatches === 1 ? "" : "s"} en {filtered.length}{" "}
            compañía{filtered.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {list.map((c) => {
          const isOpen = filtered ? true : open === c.company;
          return (
            <div key={c.company} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => !filtered && setOpen(isOpen ? null : c.company)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="font-medium">{c.company}</span>
                <span className="flex items-center gap-3 text-sm text-gray-500">
                  <span>
                    {filtered ? `${c.tracks.length} coincidencias` : `${c.count} tracks · ${c.pct}%`}
                  </span>
                  {!filtered && (
                    <span
                      className="transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                    >
                      ▾
                    </span>
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="overflow-x-auto border-t">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 font-normal">Artista</th>
                        <th className="px-4 py-2 font-normal">Track</th>
                        <th className="px-4 py-2 font-normal">Álbum</th>
                        <th className="px-4 py-2 font-normal">ISRC</th>
                        <th className="px-4 py-2 font-normal">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {c.tracks.map((t, i) => (
                        <tr key={i}>
                          <td className="px-4 py-1.5">{t.artist || "—"}</td>
                          <td className="px-4 py-1.5">{t.track || "—"}</td>
                          <td className="px-4 py-1.5">{t.album || "—"}</td>
                          <td className="px-4 py-1.5 font-mono text-xs">
                            {t.isrc || "—"}
                          </td>
                          <td className="px-4 py-1.5">{t.release_date || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {filtered && filtered.length === 0 && (
          <p className="text-sm text-gray-500 px-1">Sin resultados para &quot;{q}&quot;.</p>
        )}
      </div>
    </div>
  );
}
