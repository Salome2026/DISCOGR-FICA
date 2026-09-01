// Typed wrappers for /api/admin/users* — admin-only user management.

import { apiFetch } from "./client";
import type { AppUser, Artist } from "../types/admin";
import type { Role, AccountType } from "../permissions";

export function listAppUsers(): Promise<{ users: AppUser[] }> {
  return apiFetch("/api/admin/users");
}

export function createAppUser(input: { email: string; name: string; password: string; accountType: AccountType; roles: Role[] }): Promise<{ user: AppUser }> {
  return apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify(input) });
}

function patchUser(email: string, body: Record<string, unknown>): Promise<{ ok: true; error?: string }> {
  return apiFetch(`/api/admin/users/${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function addUserRole(email: string, role: Role): Promise<{ ok: true; error?: string }> {
  return patchUser(email, { action: "add_role", role });
}

export function removeUserRole(email: string, role: Role): Promise<{ ok: true; error?: string }> {
  return patchUser(email, { action: "remove_role", role });
}

export function setUserActive(email: string, active: boolean): Promise<{ ok: true }> {
  return patchUser(email, { action: "set_active", active }) as Promise<{ ok: true }>;
}

export function resetUserPassword(email: string, password: string): Promise<{ ok: true; error?: string }> {
  return patchUser(email, { action: "reset_password", password });
}

export function forceUserLogout(email: string): Promise<{ ok: true }> {
  return patchUser(email, { action: "force_logout" }) as Promise<{ ok: true }>;
}

export function listAdminArtists(): Promise<{ artists: Artist[] }> {
  return apiFetch("/api/artists");
}

export function upsertAdminArtist(input: {
  id?: string;
  name: string;
  aliases: string;
  sello: string | null;
  instagram: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  chartmetricId: string;
}): Promise<{ artist: Artist }> {
  return apiFetch("/api/artists", { method: "POST", body: JSON.stringify(input) });
}
