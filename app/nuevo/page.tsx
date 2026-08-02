"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NuevoAcuerdo() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [compania, setCompania] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, compania, prioridad, comentario }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo guardar.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Nuevo acuerdo</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre del acuerdo *
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="Ej: Artista X"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Compañía
          <input
            value={compania}
            onChange={(e) => setCompania(e.target.value)}
            className="border rounded-md px-3 py-2"
            placeholder="ADA / FUGA / ELLOS"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Prioridad
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Comentario
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="border rounded-md px-3 py-2"
            rows={3}
          />
        </label>

        {error && (
          <p className="text-red-600 text-sm border border-red-300 bg-red-50 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar en Notion"}
        </button>
      </form>
    </main>
  );
}
