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
  "crear_release_legal",
  "ver_ar",
  "editar_ar",
  "administrar_asignaciones_pm",
  "ver_cm",
  "editar_cm",
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
  "community_manager",
  "artista",
  "representante",
  "invitado",
] as const;

export type Role = (typeof ROLES)[number];

export type AccountType = "empresa" | "artista";

// Roles available for each landing-page account type. An "artista" role only makes
// sense behind the Artista card; company roles only behind the Empresa card.
export const ROLES_BY_ACCOUNT_TYPE: Record<AccountType, Role[]> = {
  empresa: ["admin", "project_manager", "legal", "editorial", "management", "booking", "tourmanager", "distribucion", "marketing", "ar", "community_manager", "invitado"],
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
    "crear_release_legal",
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
  // Same isolation principle again — its own module, own permissions, plus
  // the one narrow cross-module capability of administering which PM owns
  // which artist (deliberately not administrar_usuarios, which would also
  // unlock role/password/force-logout admin actions).
  // "ver_cm" (no "editar_cm") es a propósito: Management ve todas las
  // cuentas y resultados de Community Manager, pero no edita el contenido
  // de una CM ajena — mismo criterio asimétrico que ya usa PM con "ver_ar".
  management: ["ver_management", "editar_management", "administrar_asignaciones_pm", "ver_cm"],
  // Same isolation principle again — its own module, own permissions.
  booking: ["ver_booking", "editar_booking"],
  // Same isolation principle again — its own module, own permissions.
  tourmanager: ["ver_tourmanager", "editar_tourmanager"],
  // Same isolation principle again — its own module, own permissions.
  ar: ["ver_ar", "editar_ar"],
  // Same isolation principle again — its own module, own permissions.
  community_manager: ["ver_cm", "editar_cm"],
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
  community_manager: "/panel/cm",
  distribucion: "/panel/distribucion",
  marketing: "/panel/marketing",
  artista: "/panel/artista",
  representante: "/panel/artista",
  invitado: "/panel/invitado",
};

// Human-readable label per role — used anywhere a role is shown to a user
// (assignment <select>s, etc.) instead of the raw string value.
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  project_manager: "Project Manager",
  legal: "Legal",
  editorial: "Editorial",
  management: "Management",
  booking: "Booking",
  tourmanager: "Tour Manager",
  ar: "A&R",
  community_manager: "Community Manager",
  distribucion: "Distribución",
  marketing: "Marketing",
  artista: "Artista",
  representante: "Representante",
  invitado: "Invitado",
};

// A single account can hold several roles at once (multi-module accounts) —
// `roles` is always an array, empty meaning "no access" (equivalent to the
// old `role: null`). Every permission/home lookup below unions or maps over
// this array instead of doing a single-role lookup.
export type SessionUser = {
  email: string;
  roles: Role[];
  extraPermissions?: Permission[];
  revokedPermissions?: Permission[];
};

export function hasPermission(user: SessionUser | null | undefined, perm: Permission): boolean {
  if (!user || !user.roles?.length) return false;
  if (user.revokedPermissions?.includes(perm)) return false;
  if (user.extraPermissions?.includes(perm)) return true;
  return user.roles.some((r) => ROLE_PERMISSIONS[r]?.includes(perm));
}

export function homeFor(role: Role): string {
  return ROLE_HOME[role] ?? "/acceso-denegado";
}

export type ModuleOption = { role: Role; label: string; home: string };

// One entry per enabled role — the source both the post-login module picker
// (app/page.tsx) and the admin "Módulos" column build on.
export function resolveModules(roles: Role[]): ModuleOption[] {
  return roles.map((role) => ({ role, label: ROLE_LABELS[role], home: ROLE_HOME[role] }));
}
