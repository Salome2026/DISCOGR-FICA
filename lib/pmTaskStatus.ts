export type TaskStatus = "Pendiente" | "Completado" | "No corresponde";

export type BoardRow = {
  tipo_obra: string | null;
  split_override: boolean;
  release_request_id: string | null;
  split_id: string | null;
};

export type TaskStatuses = {
  releaseStatus: TaskStatus;
  splitStatus: TaskStatus;
};

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

  return { releaseStatus, splitStatus };
}
