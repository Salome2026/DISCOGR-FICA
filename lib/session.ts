import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "@/auth";
import type { SessionUser } from "@/lib/permissions";

// Single helper an API route can call regardless of which client is asking —
// a Bearer token (mobile, minted by app/api/auth/mobile-login) or the
// existing NextAuth session cookie (web). Adopted route-by-route, not a
// forced rewrite of the 68+ existing sessionUser() copies — routes that
// haven't migrated yet keep working exactly as before.
function secret(): Uint8Array {
  const s = process.env.MOBILE_JWT_SECRET;
  if (!s) throw new Error("MOBILE_JWT_SECRET no está configurado.");
  return new TextEncoder().encode(s);
}

export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  const authHeader = req?.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { payload } = await jwtVerify(authHeader.slice(7), secret());
      return payload as unknown as SessionUser;
    } catch {
      return null;
    }
  }
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user as unknown as SessionUser;
}
