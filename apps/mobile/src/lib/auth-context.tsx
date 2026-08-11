import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { loginRequest, loadStoredSession, logoutRequest, type MobileUser } from "./api";
import { ApiError } from "@discografica/shared/api/client";

type AuthState = {
  user: MobileUser | null;
  status: "loading" | "signedOut" | "signedIn";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  useEffect(() => {
    loadStoredSession().then((stored) => {
      setUser(stored);
      setStatus(stored ? "signedIn" : "signedOut");
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await loginRequest(email, password);
    setUser(loggedIn);
    setStatus("signedIn");
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus("signedOut");
  }, []);

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? "No se pudo iniciar sesión.";
  }
  return "No se pudo conectar con el servidor.";
}
