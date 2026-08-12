import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials, getUserByEmail } from "@/lib/db/users";

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
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpCode = credentials?.totpCode as string | undefined;
        if (!email || !password) return null;
        const result = await verifyCredentials(email, password, totpCode);
        if (result.status !== "ok") return null;
        return {
          id: result.user.email,
          email: result.user.email,
          name: result.user.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
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
