import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials, getUserByEmail } from "@/lib/db/users";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await verifyCredentials(email, password);
        if (!user) return null;
        return {
          id: user.email,
          email: user.email,
          name: user.name,
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
          invalid: token.invalid ?? false,
        });
      }
      return session;
    },
  },
});
