"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { useSession } from "next-auth/react";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { OpShell, OpModal } from "../_shared";
import OpDataTable, { type OpColumn } from "../DataTable";
import type { OpIndyanaOld, OpIndyanaOldInput } from "@discografica/shared/types/op";

function IndyanaForm({ initial, onCancel, onSaved }: { initial: OpIndyanaOld | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OpIndyanaOldInput>({
    titulo: initial?.titulo ?? "", releaseDate: initial?.releaseDate ?? "", isrc: initial?.isrc ?? "",
    isrcVideo: initial?.isrcVideo ?? "", nombreEpLp: initial?.nombreEpLp ?? "", upc: initial?.upc ?? "", mainArtists: initial?.mainArtists ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = initial ? `/api/op/indyana-old/${initial.id}` : "/api/op/indyana-old";
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
      <div style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Editar registro" : "Nuevo registro INDYANA (old)"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="op-field-label">Título</label><input className="op-input" value={form.titulo ?? ""} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
        <div><label className="op-field-label">Release Date</label><input type="date" className="op-input" value={form.releaseDate ?? ""} onChange={(e) => setForm({ ...form, releaseDate: e.target.value })} /></div>
        <div><label className="op-field-label">ISRC</label><input className="op-input" value={form.isrc ?? ""} onChange={(e) => setForm({ ...form, isrc: e.target.value })} /></div>
        <div><label className="op-field-label">ISRC Video</label><input className="op-input" value={form.isrcVideo ?? ""} onChange={(e) => setForm({ ...form, isrcVideo: e.target.value })} /></div>
        <div><label className="op-field-label">Nombre EP/LP</label><input className="op-input" value={form.nombreEpLp ?? ""} onChange={(e) => setForm({ ...form, nombreEpLp: e.target.value })} /></div>
        <div><label className="op-field-label">UPC</label><input className="op-input" value={form.upc ?? ""} onChange={(e) => setForm({ ...form, upc: e.target.value })} /></div>
        <div><label className="op-field-label">Main Artists</label><input className="op-input" value={form.mainArtists ?? ""} onChange={(e) => setForm({ ...form, mainArtists: e.target.value })} /></div>
      </div>
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

function IndyanaOldContent() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_op");

  const [rows, setRows] = useState<OpIndyanaOld[] | null>(null);
  const [editing, setEditing] = useState<OpIndyanaOld | "new" | null>(null);

  function load() {
    fetch("/api/op/indyana-old").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }
  useEffect(load, []);

  const columns: OpColumn<OpIndyanaOld>[] = [
    { key: "titulo", label: "Título" }, { key: "releaseDate", label: "Release Date" }, { key: "isrc", label: "ISRC" },
    { key: "isrcVideo", label: "ISRC Video" }, { key: "nombreEpLp", label: "Nombre EP/LP" }, { key: "upc", label: "UPC" }, { key: "mainArtists", label: "Main Artists" },
  ];

  async function handleDelete(row: OpIndyanaOld) {
    const res = await fetch(`/api/op/indyana-old/${row.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!rows) return <OpShell title="INDYANA (old)" backHref="/panel/op"><p style={{ color: "var(--text-3)" }}>Cargando...</p></OpShell>;

  return (
    <OpShell title="INDYANA (old)" subtitle={`${rows.length} registros — catálogo legado`} backHref="/panel/op">
      <OpDataTable
        rows={rows} columns={columns}
        onAdd={canEdit ? () => setEditing("new") : undefined}
        onEdit={canEdit ? (row) => setEditing(row) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        detailHref={(row) => `/panel/op/indyana-old/${row.id}`}
        exportFilename="op-indyana-old"
      />
      {editing && <IndyanaForm initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </OpShell>
  );
}

export default function IndyanaOldPage() {
  return (
    <RequireRole allow={["op"]}>
      <IndyanaOldContent />
    </RequireRole>
  );
}
