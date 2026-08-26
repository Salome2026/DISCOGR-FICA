import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials, getUserByEmail } from "@/lib/db/users";
import { TRUSTED_DEVICE_COOKIE } from "@/lib/trustedDeviceCookie";

// Delegates to the exact same cookie parser NextRequest.cookies.get() uses
// (login-check's mechanism) instead of hand-rolling a second one here — a
// hand-written regex split on ";\s*" picks the *first* match when a name
// appears twice in the header (e.g. a stale cookie from an old path/domain
// coexisting with the current one), while NextRequest's parser may resolve
// duplicates differently; routing both call sites through one
// implementation removes the possibility of them ever disagreeing on which
// value is "the" cookie.
function readCookie(request: Request, name: string): string | null {
  return new NextRequest(request).cookies.get(name)?.value ?? null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Contraseña", type: "password" },
        totpCode: { label: "Código", type: "text" },
      },
      // The 2FA branch (needs_totp) is handled client-side before this ever
      // runs — see app/api/auth/login-check/route.ts, which peeks at
      // verifyCredentials() first so the UI can ask for a code without a
      // NextAuth session existing yet. By the time authorize() runs with a
      // totpCode attached, the password has already been confirmed correct;
      // any non-"ok" outcome here is a generic failure, no need to
      // distinguish which, since the client's login-check step already did.
      // When no code is attached, the "vpo_td" cookie (if any) is what lets
      // an already-trusted browser complete sign-in without one — read
      // straight off the raw Request the way login-check reads it off
      // NextRequest, same trust check either way.
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpCode = credentials?.totpCode as string | undefined;
        if (!email || !password) return null;
        const deviceToken = readCookie(request, TRUSTED_DEVICE_COOKIE);
        const result = await verifyCredentials(email, password, totpCode, { deviceToken });
        if (result.status !== "ok") return null;
        return {
          id: result.user.email,
          email: result.user.email,
          name: result.user.name,
        };
      },
    }),
  ],
  // Explicit, not just relying on next-auth's own default (which happens to
  // also be 30 days today, but that's an implicit library detail, not a
  // guarantee) — a session on a device stays valid for 30 days of use,
  // renewed automatically each time it's active within that window.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/",
    error: "/auth-error",
  },
  callbacks: {
    async jwt({ token, trigger }) {
      if (token.email) {
        const user = await getUserByEmail(token.email as string);
        const knownVersion = token.sessionVersion as number | undefined;
        if (!user || !user.active || (knownVersion != null && knownVersion !== user.session_version)) {
          token.role = null;
          token.invalid = true;
        } else {
          token.role = user.role;
          token.accountType = user.account_type;
          token.extraPermissions = user.extra_permissions;
          token.revokedPermissions = user.revoked_permissions;
          token.sessionVersion = user.session_version;
          token.name = user.name;
          token.totpEnabled = user.totp_enabled;
          token.invalid = false;
        }
      }
      if (trigger === "update") {
        // allow client-triggered refresh after admin edits a role, etc.
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        Object.assign(session.user, {
          role: token.role ?? null,
          accountType: token.accountType ?? null,
          extraPermissions: token.extraPermissions ?? [],
          revokedPermissions: token.revokedPermissions ?? [],
          totpEnabled: token.totpEnabled ?? false,
          invalid: token.invalid ?? false,
        });
      }
      return session;
    },
  },
});
