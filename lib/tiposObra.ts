export const TIPOS_OBRA = ["Cover", "Remix", "Tema de autoría propia"] as const;
export type TipoObra = (typeof TIPOS_OBRA)[number];
