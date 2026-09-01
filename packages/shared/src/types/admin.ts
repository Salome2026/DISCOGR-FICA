// Extracted from lib/db/users.ts (AppUser) — matches GET /api/admin/users.

import type { Role, Permission, AccountType } from "../permissions";

export type AppUser = {
  email: string;
  name: string;
  account_type: AccountType;
  roles: Role[];
  extra_permissions: Permission[];
  revoked_permissions: Permission[];
  active: boolean;
  session_version: number;
  last_login: string | null;
  uses_shared_password: boolean;
};

// Extracted from lib/db/artists.ts (Artist) — the full roster record, used
// by the admin Artistas screen, not to be confused with Booking/Legal's
// scoped-down ArtistResult from /api/artists/search.
export type Artist = {
  id: string;
  name: string;
  aliases: string[];
  sello: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  spotify: string | null;
  chartmetricId: number | null;
  photoUrl: string | null;
  chartPosition: number | null;
  estadoGeneral: string | null;
  genero: string | null;
  updatedAt: string | null;
};
