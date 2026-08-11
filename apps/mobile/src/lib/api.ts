import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { configureApiClient, apiFetch } from "@discografica/shared/api/client";
import type { Role, AccountType } from "@discografica/shared/permissions";

const TOKEN_KEY = "vpo_session_token";
const USER_KEY = "vpo_session_user";

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "https://www.vpocorp.com";

configureApiClient({
  baseUrl: apiUrl,
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
});

export type MobileUser = { email: string; name: string; role: Role; accountType: AccountType };

export async function loginRequest(email: string, password: string): Promise<MobileUser> {
  const res = await apiFetch<{ token: string; user: MobileUser }>("/api/auth/mobile-login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await SecureStore.setItemAsync(TOKEN_KEY, res.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user));
  return res.user;
}

// Restores the session on app launch without a network round-trip — the
// user object returned at login is cached alongside the token itself
// (no /api/me bridge exists yet; only /api/tourmanager's GETs accept a
// Bearer token so far, migrated route-by-route as each module lands).
export async function loadStoredSession(): Promise<MobileUser | null> {
  const [token, userJson] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(USER_KEY)]);
  if (!token || !userJson) return null;
  try {
    return JSON.parse(userJson) as MobileUser;
  } catch {
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
}
