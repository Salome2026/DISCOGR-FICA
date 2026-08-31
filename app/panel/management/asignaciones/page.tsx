"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/app/components/RequireRole";
import { ManagementShell } from "../_shared";

type ManagementArtistRow = { id: string; name: string; sello: string | null };
type Assignment = { artistId: string; artistName: string; pmEmail: string; assignedBy: string; assignedAt: string };
type Pm = { email: string; name: string };
type AuditEntry = {
  id: number; email: string; action: string; at: string; detail: string | null;
  beforeState: unknown; afterState: unknown;
};

type Row = {
  artistId: string;
  artistName: string;
  sello: string | null;
  assignment: Assignment | null;
};

const modalOverlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
};
const fieldLabel: React.CSSProperties = { fontSize: 12.5, color: "var(--text-2)" };
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8,
  padding: "8px 12px", color: "var(--text-1)", fontSize: 13, marginTop: 4,
};
const primaryBtn: React.CSSProperties = {
  background: "var(--accent-gradient)", border: "none", borderRadius: 8, padding: "9px 20px",
  color: "var(--accent-ink)", fontWeight: 700, cursor: "pointer", fontSize: 13.5,
};
const secondaryBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 16px",
  color: "var(--text-2)", cursor: "pointer", fontSize: 13,
};
const smallBtn: React.CSSProperties = {
  background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 6, padding: "5px 10px",
  color: "var(--text-1)", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
};

function AssignModal({ row, pms, onClose, onSaved }: { row: Row; pms: Pm[]; onClose: () => void; onSaved: () => void }) {
  const isTransfer = !!row.assignment;
  const [pmEmail, setPmEmail] = useState(pms[0]?.email ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (isTransfer && !reason.trim()) {
      setError("Hay que indicar el motivo para transferir este artista.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/management/pm-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: row.artistId, artistName: row.artistName, pmEmail, reason: reason.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo guardar.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, width: 420, maxWidth: "95vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{isTransfer ? "Transferir" : "Asignar"} — {row.artistName}</div>
        {isTransfer && <div style={{ fontSize: 13, color: "var(--text-3)" }}>PM actual: {row.assignment!.pmEmail}</div>}
        <div>
          <div style={fieldLabel}>{isTransfer ? "Nuevo PM" : "PM"}</div>
          <select value={pmEmail} onChange={(e) => setPmEmail(e.target.value)} style={inputStyle}>
            {pms.map((p) => <option key={p.email} value={p.email}>{p.name} ({p.email})</option>)}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>Motivo {isTransfer ? "(obligatorio)" : "(opcional)"}</div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle, minHeight: 70, fontFamily: "inherit", resize: "vertical" }} />
        </div>
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button onClick={save} disabled={saving || !pmEmail} style={primaryBtn}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

function RevokeModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!reason.trim()) {
      setError("Hay que indicar el motivo para revocar este artista.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/management/pm-assignments/${row.artistId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo revocar.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, width: 420, maxWidth: "95vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Revocar — {row.artistName}</div>
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>PM actual: {row.assignment?.pmEmail}</div>
        <div>
          <div style={fieldLabel}>Motivo (obligatorio)</div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle, minHeight: 70, fontFamily: "inherit", resize: "vertical" }} />
        </div>
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ ...primaryBtn, background: "var(--crit-bg)", color: "var(--crit-ink)" }}>
            {saving ? "Revocando..." : "Revocar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkTransferModal({ rows, pms, onClose, onSaved }: { rows: Row[]; pms: Pm[]; onClose: () => void; onSaved: () => void }) {
  const [pmEmail, setPmEmail] = useState(pms[0]?.email ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!reason.trim()) {
      setError("Hay que indicar el motivo del cambio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/management/pm-assignments/bulk-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toPmEmail: pmEmail, artistIds: rows.map((r) => r.artistId), reason: reason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo transferir.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, width: 440, maxWidth: "95vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Transferir {rows.length} artista{rows.length === 1 ? "" : "s"}</div>
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>{rows.map((r) => r.artistName).join(", ")}</div>
        <div>
          <div style={fieldLabel}>Nuevo PM</div>
          <select value={pmEmail} onChange={(e) => setPmEmail(e.target.value)} style={inputStyle}>
            {pms.map((p) => <option key={p.email} value={p.email}>{p.name} ({p.email})</option>)}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>Motivo (obligatorio)</div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle, minHeight: 70, fontFamily: "inherit", resize: "vertical" }} />
        </div>
        {error && <div style={{ color: "var(--crit-ink)", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
          <button onClick={save} disabled={saving || !pmEmail} style={primaryBtn}>{saving ? "Transfiriendo..." : "Transferir"}</button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [history, setHistory] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    fetch(`/api/management/pm-assignments/${row.artistId}/history`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }, [row.artistId]);

  function describe(entry: AuditEntry): string {
    const before = (entry.beforeState as { pmEmail?: string | null } | null)?.pmEmail ?? null;
    const after = (entry.afterState as { pmEmail?: string | null } | null)?.pmEmail ?? null;
    if (!before && after) return `Asignado a ${after}`;
    if (before && after && before !== after) return `Transferido de ${before} a ${after}`;
    if (before && !after) return `Revocado (era de ${before})`;
    return entry.action;
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12, width: 500, maxWidth: "95vw", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Historial — {row.artistName}</div>
        {history === null && <p style={{ color: "var(--text-3)" }}>Cargando...</p>}
        {history?.length === 0 && <p style={{ color: "var(--text-3)" }}>Sin cambios registrados todavía.</p>}
        {history?.map((h) => (
          <div key={h.id} style={{ fontSize: 13, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
            <div style={{ fontWeight: 700 }}>{describe(h)}</div>
            <div style={{ color: "var(--text-3)", fontSize: 11.5, marginTop: 2 }}>
              {h.email} · {new Date(h.at).toLocaleString("es-AR")}
            </div>
            {h.detail && <div style={{ marginTop: 4 }}>Motivo: {h.detail}</div>}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryBtn}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function AsignacionesInner() {
  const [artists, setArtists] = useState<ManagementArtistRow[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [pms, setPms] = useState<Pm[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ type: "assign" | "revoke" | "history"; row: Row } | null>(null);
  const [bulkModal, setBulkModal] = useState(false);

  function load() {
    fetch("/api/management/artists").then((r) => r.json()).then((d) => setArtists(d.artists ?? []));
    fetch("/api/management/pm-assignments").then((r) => r.json()).then((d) => setAssignments(d.assignments ?? []));
    fetch("/api/management/pms").then((r) => r.json()).then((d) => setPms(d.pms ?? []));
  }

  useEffect(load, []);

  const rows: Row[] = useMemo(() => {
    if (!artists || !assignments) return [];
    const byId = new Map(assignments.map((a) => [a.artistId, a]));
    return artists
      .map((a) => ({ artistId: a.id, artistName: a.name, sello: a.sello, assignment: byId.get(a.id) ?? null }))
      .filter((r) => r.artistName.toLowerCase().includes(query.trim().toLowerCase()));
  }, [artists, assignments, query]);

  const selectedRows = rows.filter((r) => selected.has(r.artistId));

  function toggleSelect(artistId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });
  }

  if (!artists || !assignments || !pms) {
    return (
      <ManagementShell title="Asignaciones de PM" backHref="/panel/management">
        <p style={{ color: "var(--text-3)" }}>Cargando...</p>
      </ManagementShell>
    );
  }

  return (
    <ManagementShell title="Asignaciones de PM" backHref="/panel/management">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar artista..."
          style={{ ...inputStyle, marginTop: 0, width: 260 }}
        />
        {selectedRows.length > 0 && (
          <button style={primaryBtn} onClick={() => setBulkModal(true)}>
            Transferir {selectedRows.length} seleccionado{selectedRows.length === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em" }}>
              <th style={{ padding: "6px 10px", width: 32 }}></th>
              <th style={{ padding: "6px 10px" }}>Artista</th>
              <th style={{ padding: "6px 10px" }}>Sello</th>
              <th style={{ padding: "6px 10px" }}>PM actual</th>
              <th style={{ padding: "6px 10px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.artistId} style={{ borderTop: "1px solid var(--line-soft)" }}>
                <td style={{ padding: "8px 10px" }}>
                  <input type="checkbox" checked={selected.has(r.artistId)} onChange={() => toggleSelect(r.artistId)} />
                </td>
                <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.artistName}</td>
                <td style={{ padding: "8px 10px", color: "var(--text-3)" }}>{r.sello ?? "—"}</td>
                <td style={{ padding: "8px 10px" }}>{r.assignment?.pmEmail ?? <span style={{ color: "var(--text-3)" }}>Sin asignar</span>}</td>
                <td style={{ padding: "8px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={smallBtn} onClick={() => setModal({ type: "assign", row: r })}>
                    {r.assignment ? "Transferir" : "Asignar"}
                  </button>
                  {r.assignment && (
                    <button style={smallBtn} onClick={() => setModal({ type: "revoke", row: r })}>Revocar</button>
                  )}
                  <button style={smallBtn} onClick={() => setModal({ type: "history", row: r })}>Historial</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === "assign" && (
        <AssignModal row={modal.row} pms={pms} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.type === "revoke" && (
        <RevokeModal row={modal.row} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.type === "history" && <HistoryModal row={modal.row} onClose={() => setModal(null)} />}
      {bulkModal && (
        <BulkTransferModal
          rows={selectedRows}
          pms={pms}
          onClose={() => setBulkModal(false)}
          onSaved={() => { setBulkModal(false); setSelected(new Set()); load(); }}
        />
      )}
    </ManagementShell>
  );
}

export default function AsignacionesPage() {
  return (
    <RequireRole allow={["admin", "management"]}>
      <AsignacionesInner />
    </RequireRole>
  );
}
