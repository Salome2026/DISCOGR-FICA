"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { useSession } from "next-auth/react";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { OpShell, OpModal } from "../_shared";
import OpDataTable, { type OpColumn, type OpFilter } from "../DataTable";
import type { OpRepertorioCapif, OpRepertorioCapifInput } from "@discografica/shared/types/op";

function RepertorioForm({ initial, onCancel, onSaved }: { initial: OpRepertorioCapif | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OpRepertorioCapifInput>({
    titulo: initial?.titulo ?? "", album: initial?.album ?? "", artista: initial?.artista ?? "", isrc: initial?.isrc ?? "",
    sello: initial?.sello ?? "", titularDerecho: initial?.titularDerecho ?? "", periodo: initial?.periodo ?? "",
    anioPublicacion: initial?.anioPublicacion ?? null, envioMonitoreo: initial?.envioMonitoreo ?? "", capif: initial?.capif ?? "SI",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.isrc?.trim()) { setError("El ISRC es obligatorio."); return; }
    setSaving(true);
    setError(null);
    try {
      const url = initial ? `/api/op/repertorio-capif/${initial.id}` : "/api/op/repertorio-capif";
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
    <OpModal onClose={onCancel} width={600}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Editar registro" : "Nuevo registro en Repertorio CAPIF"}</div>
      <div style={{ fontSize: 12, color: "var(--warn-ink)" }}>Este cambio actualiza al instante el cruce CAPIF de OGS/REMIX para este ISRC.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="op-field-label">Título</label><input className="op-input" value={form.titulo ?? ""} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
        <div><label className="op-field-label">Álbum</label><input className="op-input" value={form.album ?? ""} onChange={(e) => setForm({ ...form, album: e.target.value })} /></div>
        <div><label className="op-field-label">Artista</label><input className="op-input" value={form.artista ?? ""} onChange={(e) => setForm({ ...form, artista: e.target.value })} /></div>
        <div><label className="op-field-label">ISRC *</label><input className="op-input" value={form.isrc} onChange={(e) => setForm({ ...form, isrc: e.target.value })} /></div>
        <div><label className="op-field-label">Sello</label><input className="op-input" value={form.sello ?? ""} onChange={(e) => setForm({ ...form, sello: e.target.value })} /></div>
        <div><label className="op-field-label">Titular derecho</label><input className="op-input" value={form.titularDerecho ?? ""} onChange={(e) => setForm({ ...form, titularDerecho: e.target.value })} /></div>
        <div><label className="op-field-label">Período</label><input className="op-input" value={form.periodo ?? ""} onChange={(e) => setForm({ ...form, periodo: e.target.value })} /></div>
        <div><label className="op-field-label">Año de publicación</label><input type="number" className="op-input" value={form.anioPublicacion ?? ""} onChange={(e) => setForm({ ...form, anioPublicacion: e.target.value ? Number(e.target.value) : null })} /></div>
        <div><label className="op-field-label">Envío a monitoreo</label><input className="op-input" value={form.envioMonitoreo ?? ""} onChange={(e) => setForm({ ...form, envioMonitoreo: e.target.value })} /></div>
        <div><label className="op-field-label">CAPIF</label><input className="op-input" value={form.capif ?? ""} onChange={(e) => setForm({ ...form, capif: e.target.value })} /></div>
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

function RepertorioContent() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_op");

  const [rows, setRows] = useState<OpRepertorioCapif[] | null>(null);
  const [editing, setEditing] = useState<OpRepertorioCapif | "new" | null>(null);

  function load() {
    fetch("/api/op/repertorio-capif").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }
  useEffect(load, []);

  const selloOptions = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.sello).filter((v): v is string => !!v))).sort(), [rows]);

  const columns: OpColumn<OpRepertorioCapif>[] = [
    { key: "titulo", label: "Título" }, { key: "album", label: "Álbum" }, { key: "artista", label: "Artista" },
    { key: "isrc", label: "ISRC" }, { key: "sello", label: "Sello" }, { key: "titularDerecho", label: "Titular derecho" },
    { key: "periodo", label: "Período" }, { key: "anioPublicacion", label: "Año" },
    { key: "envioMonitoreo", label: "Envío a monitoreo" }, { key: "capif", label: "CAPIF" },
  ];
  const filters: OpFilter<OpRepertorioCapif>[] = [
    { key: "sello", label: "Sello", options: selloOptions, getValue: (r) => r.sello },
    { key: "envioMonitoreo", label: "Envío a monitoreo", options: ["SI", "NO"], getValue: (r) => r.envioMonitoreo },
  ];

  async function handleDelete(row: OpRepertorioCapif) {
    const res = await fetch(`/api/op/repertorio-capif/${row.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!rows) return <OpShell title="Repertorio CAPIF" backHref="/panel/op"><p style={{ color: "var(--text-3)" }}>Cargando...</p></OpShell>;

  return (
    <OpShell title="Repertorio CAPIF" subtitle={`${rows.length} registros`} backHref="/panel/op">
      <OpDataTable
        rows={rows} columns={columns} filters={filters}
        onAdd={canEdit ? () => setEditing("new") : undefined}
        onEdit={canEdit ? (row) => setEditing(row) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        detailHref={(row) => `/panel/op/repertorio-capif/${row.id}`}
        exportFilename="op-repertorio-capif"
      />
      {editing && <RepertorioForm initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </OpShell>
  );
}

export default function RepertorioCapifPage() {
  return (
    <RequireRole allow={["op"]}>
      <RepertorioContent />
    </RequireRole>
  );
}
