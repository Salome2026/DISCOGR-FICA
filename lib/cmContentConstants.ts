// Constantes puras de Community Manager, sin ningún import de DB — a
// diferencia de lib/db/cmContent.ts (que trae @vercel/postgres y otros
// módulos server-only), este archivo es seguro de importar desde
// componentes "use client" sin arrastrar código de servidor al bundle.
export const CM_TIPOS_CONTENIDO = ["reel", "historia", "tiktok", "short", "post", "anuncio", "recordatorio"] as const;
export type CmTipoContenido = (typeof CM_TIPOS_CONTENIDO)[number];

export const CM_ESTADOS = ["idea", "pendiente_material", "en_produccion", "listo", "programado", "publicado", "cancelado"] as const;
export type CmEstado = (typeof CM_ESTADOS)[number];

export const CM_PLATAFORMAS = ["Instagram", "TikTok", "YouTube Shorts", "Otra"] as const;
export type CmPlataforma = (typeof CM_PLATAFORMAS)[number];
