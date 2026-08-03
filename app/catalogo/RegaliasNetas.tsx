"use client";

import { useEffect, useMemo, useState } from "react";

type Track = {
  id: string;
  track: string;
  album: string | null;
  artist_display: string;
  sello: string | null;
};

type PartyType = "sello" | "artista";
type Split = { id?: number; partyType: PartyType; partyName: string; percentage: string };

export default function RegaliasNetas() {
  const [allTracks, setAllTracks] = useState<Track[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Track | null>(null);
  const [splits, setSplits] = useState<Split[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog/tracks")
      .then((r) => r.json())
      .then((d) => !d.error && setAllTracks(d.tracks))
      .catch(() => {});
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !allTracks) return [];
    return allTracks
      .filter(
        (t) =>
          t.track.toLowerCase().includes(q) ||
          t.artist_display.toLowerCase().includes(q) ||
          (t.album || "").toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [allTracks, query]);

  function selectTrack(t: Track) {
    setSelected(t);
    setQuery("");
    setSaveMsg(null);
    setSplits(null);
    fetch(`/api/royalties/${encodeURIComponent(t.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setSplits(
          d.splits.length > 0
            ? d.splits.map((s: { party_type: PartyType; party_name: string; percentage: number }) => ({
                partyType: s.party_type,
                partyName: s.party_name,
                percentage: String(s.percentage),
              }))
            : []
        );
      });
  }

  function addRow(partyType: PartyType) {
    setSplits((prev) => [...(prev ?? []), { partyType, partyName: "", percentage: "" }]);
  }

  function updateRow(i: number, patch: Partial<Split>) {
    setSplits((prev) => (prev ? prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) : prev));
  }

  function removeRow(i: number) {
    setSplits((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const total = (splits ?? []).reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

  async function save() {
    if (!selected || !splits) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/royalties/${encodeURIComponent(selected.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splits: splits.map((s) => ({
            partyType: s.partyType,
            partyName: s.partyName,
            percentage: Number(s.percentage),
          })),
        }),
      });
      const d = await res.json();
      if (d.error) setSaveMsg(`Error: ${d.error}`);
      else setSaveMsg("Guardado.");
    } catch (e) {
      setSaveMsg(`Error: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <style>{`
        .rn-input{width:100%;background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;}
        .rn-results{margin-top:6px;border:1px solid var(--line-soft);border-radius:10px;overflow:hidden;}
        .rn-result{padding:8px 12px;font-size:12.5px;cursor:pointer;border-bottom:1px solid var(--line-soft);}
        .rn-result:last-child{border-bottom:none;}
        .rn-result:hover{background:var(--bg-2);}
        .rn-split-row{display:grid;grid-template-columns:110px 1fr 90px 28px;gap:8px;align-items:center;margin-bottom:8px;}
        .rn-split-row select, .rn-split-row input{background:var(--bg-2);border:1px solid var(--line-soft);border-radius:8px;padding:7px 10px;color:var(--text-1);font-size:12.5px;}
        .rn-remove{background:transparent;border:none;color:var(--text-3);cursor:pointer;font-size:16px;}
        .rn-add{background:transparent;border:1px dashed var(--line-soft);border-radius:8px;padding:6px 12px;color:var(--text-2);font-size:12px;cursor:pointer;margin-right:8px;}
      `}</style>
      <div className="card-label">Cálculo de regalías netas</div>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>
        Buscá un fonograma para ver o cargar su reparto porcentual. Cada fonograma tiene su propio
        reparto — no hay un porcentaje general para todo el catálogo. Solo se muestran/guardan
        porcentajes, no montos.
      </p>

      <input
        type="text"
        className="rn-input"
        placeholder="Buscar fonograma por nombre, artista o álbum..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div className="rn-results">
          {results.map((t) => (
            <div key={t.id} className="rn-result" onClick={() => selectTrack(t)}>
              <strong>{t.track}</strong> — {t.artist_display.replace(/\|/g, ", ")}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.track}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
            {selected.artist_display.replace(/\|/g, ", ")}
            {selected.sello ? ` · ${selected.sello}` : ""}
          </div>

          {splits === null ? (
            <p className="empty" style={{ padding: 0 }}>Cargando reparto...</p>
          ) : (
            <>
              {splits.length === 0 && (
                <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 12 }}>
                  Sin reparto cargado todavía para este fonograma.
                </p>
              )}
              {splits.map((s, i) => (
                <div className="rn-split-row" key={i}>
                  <select
                    value={s.partyType}
                    onChange={(e) => updateRow(i, { partyType: e.target.value as PartyType })}
                  >
                    <option value="sello">Sello</option>
                    <option value="artista">Artista</option>
                  </select>
                  <input
                    type="text"
                    placeholder={s.partyType === "sello" ? "Nombre del sello" : "Nombre del artista"}
                    value={s.partyName}
                    onChange={(e) => updateRow(i, { partyName: e.target.value })}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="%"
                    value={s.percentage}
                    onChange={(e) => updateRow(i, { percentage: e.target.value })}
                  />
                  <button type="button" className="rn-remove" onClick={() => removeRow(i)}>×</button>
                </div>
              ))}

              <div style={{ margin: "10px 0" }}>
                <button type="button" className="rn-add" onClick={() => addRow("sello")}>+ Sello</button>
                <button type="button" className="rn-add" onClick={() => addRow("artista")}>+ Artista</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: total === 100 ? "var(--good)" : "var(--text-3)" }}>
                  Total: {total}%
                </span>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || splits.length === 0}
                  style={{
                    background: "var(--accent-glass-bg)",
                    border: "1px solid var(--accent-glass-border)",
                    borderRadius: 8,
                    padding: "8px 18px",
                    color: "var(--text-1)",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: splits.length === 0 ? "default" : "pointer",
                    opacity: splits.length === 0 ? 0.5 : 1,
                    backdropFilter: "blur(20px) saturate(1.7)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.7)",
                  }}
                >
                  Guardar reparto
                </button>
              </div>
              {saveMsg && (
                <p style={{ fontSize: 12, color: "var(--gold)", marginTop: 8 }}>{saveMsg}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
