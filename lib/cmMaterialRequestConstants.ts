// Constantes puras, sin imports de DB — mismo motivo que
// lib/cmContentConstants.ts (bug real de esta sesión: importar desde un
// archivo con @vercel/postgres rompe el bundle de Turbopack cuando varios
// client components lo importan). Server y cliente comparten esta única
// lista para que el checklist del formulario y la validación del servidor
// nunca diverjan.
export const MATERIAL_NEEDS_FIELDS = [
  { key: "driveAssets", label: "Link de assets (carpeta de Drive)" },
  { key: "youtubeVideo", label: "Video de YouTube" },
  { key: "portada", label: "Portada" },
  { key: "fotos", label: "Fotografías" },
  { key: "videosVerticales", label: "Videos verticales" },
  { key: "audio", label: "Audio" },
  { key: "copy", label: "Copy" },
  { key: "fechaHorario", label: "Fecha / horario" },
] as const;

export type MaterialNeedKey = (typeof MATERIAL_NEEDS_FIELDS)[number]["key"];
export type MaterialNeeds = Record<MaterialNeedKey, boolean>;

export function emptyMaterialNeeds(): MaterialNeeds {
  return {
    driveAssets: false, youtubeVideo: false, portada: false, fotos: false,
    videosVerticales: false, audio: false, copy: false, fechaHorario: false,
  };
}

export const CM_REQUEST_TIPOS = ["material", "link_incorrecto", "observacion"] as const;
export type CmRequestTipo = (typeof CM_REQUEST_TIPOS)[number];

export const CM_REQUEST_TIPO_LABELS: Record<CmRequestTipo, string> = {
  material: "Solicitud de material",
  link_incorrecto: "Enlace incorrecto",
  observacion: "Observación",
};
