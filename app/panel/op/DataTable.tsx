"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// Generaliza app/components/DrillDown.tsx (el único componente del proyecto
// con búsqueda + orden + paginación + header pegajoso) a una tabla de
// página completa, sumándole filtros por dropdown (patrón de
// app/panel/booking/ContactsPanel.tsx), acciones por fila y exportar CSV —
// ninguno de los dos existía combinado en el proyecto.

export type OpColumn<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
  csvValue?: (row: T) => string;
};

export type OpFilter<T> = {
  key: string;
  label: string;
  options: string[];
  getValue: (row: T) => string | null;
};

type Props<T extends { id: string }> = {
  rows: T[];
  columns: OpColumn<T>[];
  filters?: OpFilter<T>[];
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  detailHref?: (row: T) => string;
  pageSize?: number;
  exportFilename?: string;
};

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export default function OpDataTable<T extends { id: string }>({
  rows,
  columns,
  filters = [],
  onAdd,
  onEdit,
  onDelete,
  detailHref,
  pageSize = 50,
  exportFilename = "export",
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    for (const f of filters) {
      const val = activeFilters[f.key];
      if (val) r = r.filter((row) => f.getValue(row) === val);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter((row) => columns.some((c) => { const v = row[c.key]; return v != null && String(v).toLowerCase().includes(q); }));
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      });
    }
    return r;
  }, [rows, query, activeFilters, filters, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(key: keyof T) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
    setPage(0);
  }

  function exportCsv() {
    const header = columns.map((c) => csvEscape(c.label)).join(",");
    const lines = filtered.map((row) =>
      columns.map((c) => csvEscape(c.csvValue ? c.csvValue(row) : String(row[c.key] ?? ""))).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(row: T) {
    if (!onDelete) return;
    if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
    setDeletingId(row.id);
    try {
      await onDelete(row);
    } finally {
      setDeletingId(null);
    }
  }

  const hasActions = !!(onEdit || onDelete || detailHref);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="Buscar..."
          style={{ flex: "1 1 220px", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 12px", color: "var(--text-1)", fontSize: 13.5 }}
        />
        {filters.map((f) => (
          <select
            key={f.key}
            value={activeFilters[f.key] ?? ""}
            onChange={(e) => { setActiveFilters((prev) => ({ ...prev, [f.key]: e.target.value })); setPage(0); }}
            style={{ background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "9px 12px", color: "var(--text-1)", fontSize: 13 }}
          >
            <option value="">{f.label}: todos</option>
            {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ))}
        <button type="button" onClick={exportCsv} style={ghostBtn}>⬇ Exportar CSV</button>
        {onAdd && <button type="button" onClick={onAdd} style={primaryBtn}>+ Agregar</button>}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-3)" }}>
        {filtered.length} registro{filtered.length === 1 ? "" : "s"}
      </div>

      <div style={{ overflowX: "auto", background: "var(--bg-1)", borderRadius: 12, border: "1px solid var(--line-soft)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  onClick={() => toggleSort(c.key)}
                  style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-3)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", borderBottom: "1px solid var(--line-soft)", position: "sticky", top: 0, background: "var(--bg-1)", zIndex: 1 }}
                >
                  {c.label}{sortKey === c.key ? (sortDir === 1 ? " ↑" : " ↓") : ""}
                </th>
              ))}
              {hasActions && (
                <th style={{ borderBottom: "1px solid var(--line-soft)", position: "sticky", top: 0, background: "var(--bg-1)", zIndex: 1 }} />
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={String(c.key)} style={{ padding: "9px 12px", borderBottom: "1px solid var(--line-soft)", whiteSpace: "nowrap" }}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
                {hasActions && (
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line-soft)", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {detailHref && (
                        <Link href={detailHref(row)} style={{ ...ghostBtnSm, textDecoration: "none", display: "inline-block" }}>Ver</Link>
                      )}
                      {onEdit && <button type="button" onClick={() => onEdit(row)} style={ghostBtnSm}>Editar</button>}
                      {onDelete && (
                        <button type="button" onClick={() => handleDelete(row)} disabled={deletingId === row.id} style={{ ...ghostBtnSm, color: "var(--crit-ink)" }}>
                          {deletingId === row.id ? "..." : "Eliminar"}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} style={{ padding: "2rem 0", textAlign: "center", color: "var(--text-3)" }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-3)" }}>
          <span>Página {page + 1} de {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} style={ghostBtnSm}>Anterior</button>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} style={ghostBtnSm}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

const ghostBtn: React.CSSProperties = { background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "9px 14px", color: "var(--text-2)", fontSize: 12.5, cursor: "pointer" };
const ghostBtnSm: React.CSSProperties = { background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 6, padding: "5px 10px", color: "var(--text-2)", fontSize: 12, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { background: "var(--accent-gradient)", border: "none", borderRadius: 8, padding: "9px 18px", color: "var(--accent-ink)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" };
