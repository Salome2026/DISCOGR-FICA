// Genérico, compartido — no existía ningún diff campo-por-campo reusable en
// el proyecto (el único caso que muestra historial en pantalla, en
// app/panel/management/asignaciones/page.tsx, narra a mano un solo campo
// conocido). Cada caller de OP guarda la fila completa antes de editar y
// pasa esas dos fotos completas acá — así "cualquier campo modificado"
// queda cubierto sin tener que enumerar campos a mano en cada handler.
export type FieldDiff = {
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
};

// Ambas formas porque distintos callers pasan antes/después ya sea como fila
// cruda de Postgres (snake_case) o como el tipo mapeado (camelCase) — un
// caller que pase el tipo mapeado en "created" (en vez de la fila cruda con
// RETURNING *) no debe hacer que estos campos técnicos aparezcan como si
// fueran ediciones reales.
const SKIP_KEYS = new Set([
  "id", "created_by", "created_at", "updated_by", "updated_at",
  "createdBy", "createdAt", "updatedBy", "updatedAt",
]);

export function diffRows(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): FieldDiff[] {
  const b = before ?? {};
  const a = after ?? {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const diffs: FieldDiff[] = [];
  for (const key of keys) {
    if (SKIP_KEYS.has(key)) continue;
    const valorAnterior = b[key] ?? null;
    const valorNuevo = a[key] ?? null;
    if (JSON.stringify(valorAnterior) !== JSON.stringify(valorNuevo)) {
      diffs.push({ campo: key, valorAnterior, valorNuevo });
    }
  }
  return diffs;
}
