// Centralized roles & permissions.
//
// This is the single source of truth for "what can this role do". Screens never
// hardcode role checks — they call hasPermission(user, "some_permission") and this
// file is the only place that maps roles to permissions. Adding a new role (A&R,
// Contabilidad, Prensa, Distribución, etc.) is a data change here, not a rewrite of
// every screen.

export const PERMISSIONS = [
  "crear_artistas",
  "editar_acuerdos",
  "eliminar_registros",
  "aprobar_releases",
  "subir_audio",
  "subir_portada",
  "ver_estadisticas",
  "exportar_datos",
  "modulo_financiero",
  "administrar_usuarios",
  "ver_legal",
  "editar_legal",
  "ver_publishing",
  "editar_publishing",
  "ver_rizzvor_proyectos",
  "editar_rizzvor_proyectos",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  "admin",
  "project_manager",
  "legal",
  "editorial",
  "distribucion",
  "marketing",
  "artista",
  "representante",
  "invitado",
] as const;

export type Role = (typeof ROLES)[number];

export type AccountType = "empresa" | "artista";

// Roles available for each landing-page account type. An "artista" role only makes
// sense behind the Artista card; company roles only behind the Empresa card.
export const ROLES_BY_ACCOUNT_TYPE: Record<AccountType, Role[]> = {
  empresa: ["admin", "project_manager", "legal", "editorial", "distribucion", "marketing", "invitado"],
  artista: ["artista", "representante"],
};

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,
  // Rizzvor's A&R pipeline is owned by PM — the same people who create
  // lanzamientos are the ones who'll click "Convertir a lanzamiento" once a
  // proyecto is ready, so it rides on the same role rather than a new one.
  project_manager: [
    "editar_acuerdos",
    "subir_audio",
    "subir_portada",
    "ver_estadisticas",
    "ver_rizzvor_proyectos",
    "editar_rizzvor_proyectos",
  ],
  // Legal is a fully separate module — its own permissions, shared with no
  // other operational area (Label/PM/Distribución/Marketing/etc). It does
  // NOT get editar_acuerdos/aprobar_releases/ver_estadisticas/exportar_datos
  // even though those existed before this module did — legal's read access
  // to release status comes from ver_legal, scoped to its own panel only.
  legal: ["ver_legal", "editar_legal"],
  // Same isolation principle as legal — its own module, own permissions,
  // nothing shared with Label/PM/Legal/Distribución/Marketing.
  editorial: ["ver_publishing", "editar_publishing"],
  distribucion: ["editar_acuerdos", "aprobar_releases", "ver_estadisticas"],
  marketing: ["ver_estadisticas", "exportar_datos"],
  artista: ["subir_audio", "subir_portada"],
  representante: ["subir_audio", "subir_portada", "ver_estadisticas"],
  invitado: [],
};

// Where each role lands right after login.
export const ROLE_HOME: Record<Role, string> = {
  admin: "/dashboard",
  project_manager: "/pm",
  legal: "/panel/legal",
  editorial: "/panel/publishing",
  distribucion: "/panel/distribucion",
  marketing: "/panel/marketing",
  artista: "/panel/artista",
  representante: "/panel/artista",
  invitado: "/panel/invitado",
};

export type SessionUser = {
  email: string;
  role: Role | null;
  extraPermissions?: Permission[];
  revokedPermissions?: Permission[];
};

export function hasPermission(user: SessionUser | null | undefined, perm: Permission): boolean {
  if (!user || !user.role) return false;
  if (user.revokedPermissions?.includes(perm)) return false;
  if (user.extraPermissions?.includes(perm)) return true;
  return ROLE_PERMISSIONS[user.role]?.includes(perm) ?? false;
}

export function homeFor(role: Role | null): string {
  if (!role) return "/acceso-denegado";
  return ROLE_HOME[role] ?? "/acceso-denegado";
}
