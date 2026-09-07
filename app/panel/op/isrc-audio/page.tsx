"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequireRole from "@/app/components/RequireRole";
import { useSession } from "next-auth/react";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { OpShell, OpModal } from "../_shared";
import OpDataTable, { type OpColumn, type OpFilter } from "../DataTable";
import type { OpIsrcAudio, OpIsrcAudioInput } from "@discografica/shared/types/op";

function IsrcAudioForm({ initial, onCancel, onSaved }: { initial: OpIsrcAudio | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OpIsrcAudioInput>({ year: initial?.year ?? new Date().getFullYear(), isrc: initial?.isrc ?? "", artista: initial?.artista ?? "", track: initial?.track ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.year) { setError("El año es obligatorio."); return; }
    setSaving(true);
    setError(null);
    try {
      const url = initial ? `/api/op/isrc-audio/${initial.id}` : "/api/op/isrc-audio";
      const res = await fetch(url, { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
    <OpModal onClose={onCancel}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Editar registro" : "Nuevo ISRC de audio"}</div>
      <div><label className="op-field-label">Año *</label><input type="number" className="op-input" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
      <div><label className="op-field-label">ISRC</label><input className="op-input" value={form.isrc ?? ""} onChange={(e) => setForm({ ...form, isrc: e.target.value })} /></div>
      <div><label className="op-field-label">Artista</label><input className="op-input" value={form.artista ?? ""} onChange={(e) => setForm({ ...form, artista: e.target.value })} /></div>
      <div><label className="op-field-label">Track</label><input className="op-input" value={form.track ?? ""} onChange={(e) => setForm({ ...form, track: e.target.value })} /></div>
      {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onCancel} style={{ background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 16px", color: "var(--text-2)", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
        <button type="button" onClick={save} disabled={saving} style={{ background: "var(--accent-gradient)", border: "none", borderRadius: 8, padding: "9px 20px", color: "var(--accent-ink)", fontWeight: 700, cursor: "pointer", fontSize: 13.5 }}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </OpModal>
  );
}

function IsrcAudioContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_op");

  const [rows, setRows] = useState<OpIsrcAudio[] | null>(null);
  const [editing, setEditing] = useState<OpIsrcAudio | "new" | null>(null);

  function load() {
    fetch("/api/op/isrc-audio").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }
  useEffect(load, []);

  const yearOptions = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.year))).sort((a, b) => b - a).map(String), [rows]);
  const initialYear = searchParams.get("year");

  const columns: OpColumn<OpIsrcAudio>[] = [
    { key: "year", label: "Año" }, { key: "isrc", label: "ISRC" }, { key: "artista", label: "Artista" }, { key: "track", label: "Track" },
  ];
  const filters: OpFilter<OpIsrcAudio>[] = [
    { key: "year", label: "Año", options: yearOptions, getValue: (r) => String(r.year) },
  ];

  async function handleDelete(row: OpIsrcAudio) {
    const res = await fetch(`/api/op/isrc-audio/${row.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!rows) return <OpShell title="ISRC Audio" backHref="/panel/op"><p style={{ color: "var(--text-3)" }}>Cargando...</p></OpShell>;

  return (
    <OpShell title="ISRC Audio" subtitle={`${rows.length} registros`} backHref="/panel/op">
      <OpDataTable
        rows={initialYear ? rows.filter((r) => String(r.year) === initialYear) : rows}
        columns={columns} filters={filters}
        onAdd={canEdit ? () => setEditing("new") : undefined}
        onEdit={canEdit ? (row) => setEditing(row) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        detailHref={(row) => `/panel/op/isrc-audio/${row.id}`}
        exportFilename="op-isrc-audio"
      />
      {editing && <IsrcAudioForm initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </OpShell>
  );
}

export default function IsrcAudioPage() {
  return (
    <RequireRole allow={["op"]}>
      <IsrcAudioContent />
    </RequireRole>
  );
}
