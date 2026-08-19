// Centralized roles & permissions.
//
// This is the single source of truth for "what can this role do". Screens never
// hardcode role checks — they call hasPermission(user, "some_permission") and this
// file is the only place that maps roles to permissions. Adding a new role (A&R,
// Contabilidad, Prensa, Distribución, etc.) is a data change here, not a rewrite of
// every screen.
//
// Lives in packages/shared (not lib/) so both the Next.js web app and the Expo
// mobile app import the exact same role/permission logic — lib/permissions.ts
// is now just a re-export shim, kept so the 68+ existing web imports of
// "@/lib/permissions" keep working unchanged.

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
  "ver_management",
  "editar_management",
  "ver_booking",
  "editar_booking",
  "ver_playlists",
  "editar_playlists",
  "ver_tourmanager",
  "editar_tourmanager",
  "crear_split_editorial",
  "ver_ar",
  "editar_ar",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  "admin",
  "project_manager",
  "legal",
  "editorial",
  "management",
  "booking",
  "tourmanager",
  "distribucion",
  "marketing",
  "ar",
  "artista",
  "representante",
  "invitado",
] as const;

export type Role = (typeof ROLES)[number];

export type AccountType = "empresa" | "artista";

// Roles available for each landing-page account type. An "artista" role only makes
// sense behind the Artista card; company roles only behind the Empresa card.
export const ROLES_BY_ACCOUNT_TYPE: Record<AccountType, Role[]> = {
  empresa: ["admin", "project_manager", "legal", "editorial", "management", "booking", "tourmanager", "distribucion", "marketing", "ar", "invitado"],
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
    "ver_playlists",
    "crear_split_editorial",
    // PM only ever sees opportunities assigned to them by the ar role — that
    // scoping happens inside listOpportunitiesFor() by role branch, not here.
    "ver_ar",
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
  // Same isolation principle again — its own module, own permissions.
  management: ["ver_management", "editar_management"],
  // Same isolation principle again — its own module, own permissions.
  booking: ["ver_booking", "editar_booking"],
  // Same isolation principle again — its own module, own permissions.
  tourmanager: ["ver_tourmanager", "editar_tourmanager"],
  // Same isolation principle again — its own module, own permissions.
  ar: ["ver_ar", "editar_ar"],
  distribucion: ["editar_acuerdos", "aprobar_releases", "ver_estadisticas"],
  marketing: ["ver_estadisticas", "exportar_datos", "ver_playlists", "editar_playlists"],
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
  management: "/panel/management",
  booking: "/panel/booking",
  tourmanager: "/panel/tourmanager",
  ar: "/panel/ar",
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
