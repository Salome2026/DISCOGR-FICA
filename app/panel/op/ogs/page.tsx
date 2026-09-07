"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { useSession } from "next-auth/react";
import { hasPermission, type SessionUser } from "@/lib/permissions";
import { OpShell, OpModal } from "../_shared";
import OpDataTable, { type OpColumn, type OpFilter } from "../DataTable";
import type { OpOgs, OpOgsInput } from "@discografica/shared/types/op";

function OgsForm({ initial, onCancel, onSaved }: { initial: OpOgs | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OpOgsInput>({
    albumArtist: initial?.albumArtist ?? "",
    album: initial?.album ?? "",
    trackArtist: initial?.trackArtist ?? "",
    track: initial?.track ?? "",
    isrc: initial?.isrc ?? "",
    upc: initial?.upc ?? "",
    releaseDate: initial?.releaseDate ?? "",
    year: initial?.year ?? null,
    provider: initial?.provider ?? "",
    sello: initial?.sello ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.trackArtist?.trim() || !form.track?.trim()) {
      setError("Track artist y track son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = initial ? `/api/op/ogs/${initial.id}` : "/api/op/ogs";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
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
      <div style={{ fontSize: 16, fontWeight: 700 }}>{initial ? "Editar registro" : "Nuevo registro OGS"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="op-field-label">Album Artist</label><input className="op-input" value={form.albumArtist ?? ""} onChange={(e) => setForm({ ...form, albumArtist: e.target.value })} /></div>
        <div><label className="op-field-label">Album</label><input className="op-input" value={form.album ?? ""} onChange={(e) => setForm({ ...form, album: e.target.value })} /></div>
        <div><label className="op-field-label">Track Artist *</label><input className="op-input" value={form.trackArtist} onChange={(e) => setForm({ ...form, trackArtist: e.target.value })} /></div>
        <div><label className="op-field-label">Track *</label><input className="op-input" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} /></div>
        <div><label className="op-field-label">ISRC</label><input className="op-input" value={form.isrc ?? ""} onChange={(e) => setForm({ ...form, isrc: e.target.value })} /></div>
        <div><label className="op-field-label">UPC</label><input className="op-input" value={form.upc ?? ""} onChange={(e) => setForm({ ...form, upc: e.target.value })} /></div>
        <div><label className="op-field-label">Release Date</label><input type="date" className="op-input" value={form.releaseDate ?? ""} onChange={(e) => setForm({ ...form, releaseDate: e.target.value })} /></div>
        <div><label className="op-field-label">Year</label><input type="number" className="op-input" value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })} /></div>
        <div><label className="op-field-label">Provider</label><input className="op-input" value={form.provider ?? ""} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
        <div><label className="op-field-label">Sello</label><input className="op-input" value={form.sello ?? ""} onChange={(e) => setForm({ ...form, sello: e.target.value })} /></div>
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

function OgsContent() {
  const { data: session } = useSession();
  const user = session?.user as unknown as SessionUser | undefined;
  const canEdit = !!user && hasPermission(user, "editar_op");

  const [rows, setRows] = useState<OpOgs[] | null>(null);
  const [editing, setEditing] = useState<OpOgs | "new" | null>(null);

  function load() {
    fetch("/api/op/ogs").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }
  useEffect(load, []);

  const selloOptions = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.sello).filter((v): v is string => !!v))).sort(), [rows]);
  const providerOptions = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.provider).filter((v): v is string => !!v))).sort(), [rows]);
  const yearOptions = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.year).filter((v): v is number => v != null))).sort((a, b) => b - a).map(String), [rows]);

  const columns: OpColumn<OpOgs>[] = [
    { key: "albumArtist", label: "Album Artist" },
    { key: "album", label: "Album" },
    { key: "trackArtist", label: "Track Artist" },
    { key: "track", label: "Track" },
    { key: "isrc", label: "ISRC" },
    { key: "upc", label: "UPC" },
    { key: "releaseDate", label: "Release Date" },
    { key: "year", label: "Year" },
    { key: "provider", label: "Provider" },
    { key: "sello", label: "Sello" },
    { key: "capif", label: "CAPIF", render: (r) => <span style={{ color: r.capif === "SI" ? "var(--good-ink)" : "var(--text-3)", fontWeight: 700 }}>{r.capif}</span> },
  ];

  const filters: OpFilter<OpOgs>[] = [
    { key: "sello", label: "Sello", options: selloOptions, getValue: (r) => r.sello },
    { key: "provider", label: "Provider", options: providerOptions, getValue: (r) => r.provider },
    { key: "year", label: "Año", options: yearOptions, getValue: (r) => (r.year != null ? String(r.year) : null) },
    { key: "capif", label: "CAPIF", options: ["SI", "NO"], getValue: (r) => r.capif },
  ];

  async function handleDelete(row: OpOgs) {
    const res = await fetch(`/api/op/ogs/${row.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!rows) return <OpShell title="OGS" backHref="/panel/op"><p style={{ color: "var(--text-3)" }}>Cargando...</p></OpShell>;

  return (
    <OpShell title="OGS" subtitle={`${rows.length} registros`} backHref="/panel/op">
      <OpDataTable
        rows={rows}
        columns={columns}
        filters={filters}
        onAdd={canEdit ? () => setEditing("new") : undefined}
        onEdit={canEdit ? (row) => setEditing(row) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        detailHref={(row) => `/panel/op/ogs/${row.id}`}
        exportFilename="op-ogs"
      />
      {editing && (
        <OgsForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </OpShell>
  );
}

export default function OgsPage() {
  return (
    <RequireRole allow={["op"]}>
      <OgsContent />
    </RequireRole>
  );
}
