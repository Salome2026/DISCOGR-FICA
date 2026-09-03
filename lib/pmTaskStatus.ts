export type TaskStatus = "Pendiente" | "Completado" | "No corresponde";

export type BoardRow = {
  tipo_obra: string | null;
  split_override: boolean;
  release_request_id: string | null;
  split_id: string | null;
  youtube_url: string | null;
  drive_assets_url: string | null;
  suggested_release_request_id?: string | null;
  suggested_split_id?: string | null;
};

export type TaskStatuses = {
  releaseStatus: TaskStatus;
  splitStatus: TaskStatus;
  materialesStatus: TaskStatus;
  materialesEstado: MaterialesEstado;
  // Un Release/Split ya cargado a mano (sin fonograma todavía) que coincide
  // por nombre — solo tiene sentido mostrarlo mientras la tarea sigue
  // Pendiente, nunca reemplaza el estado real.
  suggestedReleaseRequestId: string | null;
  suggestedSplitId: string | null;
};

// Los 6 estados pedidos para Community Manager. Con solo 2 links posibles
// (YouTube, Drive) hay 4 combinaciones reales — "assets_pendientes" y
// "video_pendiente" son las que faltan, cada una nombrando específicamente
// qué falta (más útil para la CM que un genérico "información parcial").
// "video_disponible" e "informacion_parcial" quedan disponibles como texto
// alternativo si una pantalla de detalle los necesita, pero esta función
// nunca los devuelve — es la única fuente de verdad, la usan tanto el board
// de PM como cm_launches.materiales_estado (Community Manager) para no
// tener dos fórmulas del mismo estado en dos archivos.
export type MaterialesEstado =
  | "assets_disponibles"
  | "video_disponible"
  | "informacion_parcial"
  | "assets_pendientes"
  | "video_pendiente"
  | "sin_materiales";

export function materialesEstado(youtubeUrl: string | null, driveAssetsUrl: string | null): MaterialesEstado {
  const hasYoutube = !!youtubeUrl?.trim();
  const hasDrive = !!driveAssetsUrl?.trim();
  if (hasYoutube && hasDrive) return "assets_disponibles";
  if (hasYoutube) return "assets_pendientes";
  if (hasDrive) return "video_pendiente";
  return "sin_materiales";
}

// Puro, sin DB — el estado de cada tarea se deriva de la presencia/ausencia
// de una fila relacionada, nunca se guarda aparte. Fonogramas sin tipo_obra
// (anteriores a esta feature) se tratan igual que un Cover: "No corresponde"
// hasta que alguien los edite u override.
export function deriveTaskStatuses(row: BoardRow): TaskStatuses {
  const releaseStatus: TaskStatus = row.release_request_id ? "Completado" : "Pendiente";

  let splitStatus: TaskStatus;
  if (row.split_id) {
    splitStatus = "Completado";
  } else if (row.tipo_obra === "Tema de autoría propia" || row.split_override) {
    splitStatus = "Pendiente";
  } else {
    splitStatus = "No corresponde";
  }

  const estado = materialesEstado(row.youtube_url, row.drive_assets_url);
  const materialesStatus: TaskStatus = estado === "assets_disponibles" ? "Completado" : "Pendiente";

  return {
    releaseStatus,
    splitStatus,
    materialesStatus,
    materialesEstado: estado,
    suggestedReleaseRequestId: releaseStatus === "Pendiente" ? (row.suggested_release_request_id ?? null) : null,
    suggestedSplitId: splitStatus === "Pendiente" ? (row.suggested_split_id ?? null) : null,
  };
}
