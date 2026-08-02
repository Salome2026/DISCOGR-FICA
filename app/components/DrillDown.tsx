"use client";

import { useMemo, useState } from "react";

export type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
};

type Props<T extends { id?: string | number }> = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: Column<T>[];
  urlKey?: keyof T;
  pageSize?: number;
};

export default function DrillDown<T extends { id?: string | number }>({
  open,
  onClose,
  title,
  subtitle,
  rows,
  columns,
  urlKey,
  pageSize = 20,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = rows;
    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter((row) =>
        columns.some((c) => {
          const v = row[c.key];
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * sortDir;
        }
        return String(av).localeCompare(String(bv)) * sortDir;
      });
    }
    return r;
  }, [rows, query, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (!open) return null;

  function toggleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
    setPage(0);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1c1712",
          color: "#f4ede1",
          borderRadius: 16,
          border: "1px solid #403627",
          width: "100%",
          maxWidth: 1000,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #403627",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12.5, color: "#8f8267", marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #403627",
              borderRadius: 8,
              color: "#c2b39a",
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: 14,
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div style={{ padding: "1rem 1.5rem 0" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar..."
            style={{
              width: "100%",
              background: "#242019",
              border: "1px solid #403627",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#f4ede1",
              fontSize: 13,
            }}
          />
          <div style={{ fontSize: 11.5, color: "#8f8267", margin: "8px 0" }}>
            {filtered.length} registro{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        <div style={{ overflow: "auto", flex: 1, padding: "0 1.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={String(c.key)}
                    onClick={() => toggleSort(c.key)}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      color: "#8f8267",
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      borderBottom: "1px solid #403627",
                      position: "sticky",
                      top: 0,
                      background: "#1c1712",
                    }}
                  >
                    {c.label}
                    {sortKey === c.key ? (sortDir === 1 ? " ↑" : " ↓") : ""}
                  </th>
                ))}
                {urlKey && (
                  <th
                    style={{
                      borderBottom: "1px solid #403627",
                      position: "sticky",
                      top: 0,
                      background: "#1c1712",
                    }}
                  />
                )}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={row.id ?? i}>
                  {columns.map((c) => (
                    <td
                      key={String(c.key)}
                      style={{ padding: "8px 10px", borderBottom: "1px solid #2a2119" }}
                    >
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                  {urlKey && (
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #2a2119" }}>
                      {row[urlKey] ? (
                        <a
                          href={String(row[urlKey])}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#e6a94f", fontSize: 12 }}
                        >
                          Abrir ↗
                        </a>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (urlKey ? 1 : 0)}
                    style={{ padding: "2rem 0", textAlign: "center", color: "#8f8267" }}
                  >
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderTop: "1px solid #403627",
            fontSize: 12.5,
            color: "#8f8267",
          }}
        >
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{
                background: "transparent",
                border: "1px solid #403627",
                borderRadius: 8,
                padding: "5px 12px",
                color: page === 0 ? "#544831" : "#c2b39a",
                cursor: page === 0 ? "default" : "pointer",
              }}
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={{
                background: "transparent",
                border: "1px solid #403627",
                borderRadius: 8,
                padding: "5px 12px",
                color: page >= totalPages - 1 ? "#544831" : "#c2b39a",
                cursor: page >= totalPages - 1 ? "default" : "pointer",
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
