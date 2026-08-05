"use client";

import { useState } from "react";
import type { RizzvorChecklistItem } from "@/lib/db/rizzvorProjects";

export default function ChecklistSection({
  projectId,
  items,
  onChange,
}: {
  projectId: string;
  items: RizzvorChecklistItem[];
  onChange: () => void;
}) {
  const [newLabel, setNewLabel] = useState("");

  async function toggle(id: number, done: boolean) {
    await fetch(`/api/rizzvor/projects/${projectId}/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    onChange();
  }

  async function addItem() {
    if (!newLabel.trim()) return;
    await fetch(`/api/rizzvor/projects/${projectId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    setNewLabel("");
    onChange();
  }

  async function remove(id: number) {
    await fetch(`/api/rizzvor/projects/${projectId}/checklist/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card">
      <style>{`
        .rzc-item { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line-soft); }
        .rzc-item:last-child { border-bottom: none; }
        .rzc-item label { flex: 1; font-size: 13px; cursor: pointer; }
        .rzc-item.done label { text-decoration: line-through; color: var(--text-3); }
        .rzc-meta { font-size: 10px; color: var(--text-3); }
        .rzc-del { background: transparent; border: none; color: var(--crit); cursor: pointer; font-size: 11px; }
        .rzc-add { display: flex; gap: 8px; margin-top: 10px; }
        .rzc-add input { flex: 1; background: var(--bg-2); border: 1px solid var(--line-soft); border-radius: 8px; padding: 7px 11px; color: var(--text-1); font-size: 12.5px; }
        .rzc-add button { background: transparent; border: 1px solid var(--line-soft); border-radius: 8px; padding: 7px 14px; color: var(--text-2); cursor: pointer; font-size: 12px; }
      `}</style>
      <div className="card-label">Checklist de pendientes</div>
      {items.map((item) => (
        <div className={`rzc-item${item.done ? " done" : ""}`} key={item.id}>
          <input type="checkbox" checked={item.done} onChange={(e) => toggle(item.id, e.target.checked)} />
          <label onClick={() => toggle(item.id, !item.done)}>
            {item.label}
            {item.done && item.doneBy && <span className="rzc-meta"> — {item.doneBy}</span>}
          </label>
          <button className="rzc-del" onClick={() => remove(item.id)}>×</button>
        </div>
      ))}
      {items.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 12.5 }}>Sin ítems.</p>}
      <div className="rzc-add">
        <input
          value={newLabel}
          placeholder="Agregar ítem..."
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <button onClick={addItem}>+ Agregar</button>
      </div>
    </div>
  );
}
