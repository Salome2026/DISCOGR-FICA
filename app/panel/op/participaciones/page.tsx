"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { useSession } from "next-auth/react";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { OpShell, OpModal } from "../_shared";
import OpDataTable, { type OpColumn } from "../DataTable";
import type { OpParticipacion, OpParticipacionInput } from "@discografica/shared/types/op";

function ParticipacionForm({ initial, onCancel, onSaved }: { initial: OpParticipacion | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OpParticipacionInput>({
    label: initial?.label ?? "", artists: initial?.artists ?? "", track: initial?.track ?? "", isrc: initial?.isrc ?? "",
    participante: initial?.participante ?? "", porcentaje: initial?.porcentaje ?? null, notas: initial?.notas ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = initial ? `/api/op/participaciones/${initial.id}` : "/api/op/participaciones";
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
    <OpModal onClose={onCancel} width={560}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Editar participación" : "Nueva participación"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="op-field-label">Label</label><input className="op-input" value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
        <div><label className="op-field-label">Artists</label><input className="op-input" value={form.artists ?? ""} onChange={(e) => setForm({ ...form, artists: e.target.value })} /></div>
        <div><label className="op-field-label">Track</label><input className="op-input" value={form.track ?? ""} onChange={(e) => setForm({ ...form, track: e.target.value })} /></div>
        <div><label className="op-field-label">ISRC</label><input className="op-input" value={form.isrc ?? ""} onChange={(e) => setForm({ ...form, isrc: e.target.value })} /></div>
        <div><label className="op-field-label">Participante</label><input className="op-input" value={form.participante ?? ""} onChange={(e) => setForm({ ...form, participante: e.target.value })} /></div>
        <div><label className="op-field-label">Porcentaje (0 a 1)</label><input type="number" step="0.001" className="op-input" value={form.porcentaje ?? ""} onChange={(e) => setForm({ ...form, porcentaje: e.target.value ? Number(e.target.value) : null })} /></div>
      </div>
      <div><label className="op-field-label">Notas</label><textarea className="op-input" style={{ minHeight: 70, resize: "vertical", fontFamily: "inherit" }} value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
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

function ParticipacionesContent() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_op");

  const [rows, setRows] = useState<OpParticipacion[] | null>(null);
  const [editing, setEditing] = useState<OpParticipacion | "new" | null>(null);

  function load() {
    fetch("/api/op/participaciones").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }
  useEffect(load, []);

  const columns: OpColumn<OpParticipacion>[] = [
    { key: "label", label: "Label" }, { key: "artists", label: "Artists" }, { key: "track", label: "Track" },
    { key: "isrc", label: "ISRC" }, { key: "participante", label: "Participante" },
    { key: "porcentaje", label: "%", render: (r) => (r.porcentaje != null ? `${(r.porcentaje * 100).toFixed(2)}%` : "—"), csvValue: (r) => (r.porcentaje != null ? String(r.porcentaje) : "") },
    { key: "notas", label: "Notas" },
  ];

  async function handleDelete(row: OpParticipacion) {
    const res = await fetch(`/api/op/participaciones/${row.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!rows) return <OpShell title="Participaciones" backHref="/panel/op"><p style={{ color: "var(--text-3)" }}>Cargando...</p></OpShell>;

  return (
    <OpShell title="Participaciones" subtitle={`${rows.length} registros`} backHref="/panel/op">
      <OpDataTable
        rows={rows} columns={columns}
        onAdd={canEdit ? () => setEditing("new") : undefined}
        onEdit={canEdit ? (row) => setEditing(row) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        detailHref={(row) => `/panel/op/participaciones/${row.id}`}
        exportFilename="op-participaciones"
      />
      {editing && <ParticipacionForm initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </OpShell>
  );
}

export default function ParticipacionesPage() {
  return (
    <RequireRole allow={["op"]}>
      <ParticipacionesContent />
    </RequireRole>
  );
}
