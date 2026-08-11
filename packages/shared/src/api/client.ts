// Thin, environment-agnostic fetch wrapper — the one piece both the Next.js
// web app and the Expo mobile app call through, so a change to how a
// request/response is shaped only needs to happen once.
//
// Web configures baseUrl:"" (same-origin, relies on the NextAuth cookie).
// Mobile configures baseUrl to the deployed API origin plus a getToken()
// that reads the Bearer token from expo-secure-store.

export type ApiClientConfig = {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
};

let config: ApiClientConfig = { baseUrl: "" };

export function configureApiClient(next: ApiClientConfig): void {
  config = next;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await config.getToken?.();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers,
    // Web needs the NextAuth session cookie sent along; mobile has no
    // cookie jar to send (and no cross-origin cookie to worry about either).
    credentials: config.getToken ? "omit" : "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}
