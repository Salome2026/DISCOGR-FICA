import Link from "next/link";
import { listReleases } from "@/lib/notion";

const ESTADO_COLOR: Record<string, string> = {
  Firmado: "bg-green-100 text-green-800",
  "En negociacion": "bg-yellow-100 text-yellow-800",
  Contactado: "bg-blue-100 text-blue-800",
  Aprobado: "bg-purple-100 text-purple-800",
  "NO SACAR": "bg-red-100 text-red-800",
  "Enviado a la firma": "bg-gray-100 text-gray-800",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  let releases: Awaited<ReturnType<typeof listReleases>> = [];
  let error: string | null = null;

  try {
    releases = await listReleases();
  } catch (err) {
    error = err instanceof Error ? err.message : "Error desconocido";
  }

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Releases</h1>
        <Link
          href="/nuevo"
          className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
        >
          + Nuevo acuerdo
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-800 px-4 py-3 mb-6 text-sm">
          No se pudo conectar con Notion: {error}
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Compañía</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Prioridad</th>
              <th className="px-4 py-2 font-medium">%</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {releases.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">{r.nombre || "—"}</td>
                <td className="px-4 py-2">{r.compania || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.estado.length === 0 && "—"}
                    {r.estado.map((e) => (
                      <span
                        key={e}
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          ESTADO_COLOR[e] ?? "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">{r.prioridad || "—"}</td>
                <td className="px-4 py-2">
                  {r.porcentaje != null ? `${r.porcentaje}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!error && releases.length === 0 && (
        <p className="text-gray-500 text-sm mt-4">No hay releases todavía.</p>
      )}
    </main>
  );
}
