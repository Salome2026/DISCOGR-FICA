import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyCredentials } from "@/lib/db/users";

// Mobile-only login path — NextAuth's credentials provider (auth.ts) issues a
// JWT inside an encrypted browser cookie, which a React Native app has no
// cookie jar to receive. This reuses the exact same verifyCredentials() bcrypt
// check and issues a separate, plain Bearer JWT instead — same shape as the
// existing CRON_SECRET Bearer pattern (app/api/cron/*), applied to a user
// session instead of a static secret. Verified by lib/session.ts.
function secret(): Uint8Array {
  const s = process.env.MOBILE_JWT_SECRET;
  if (!s) throw new Error("MOBILE_JWT_SECRET no está configurado.");
  return new TextEncoder().encode(s);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  if (!email || !password) {
    return NextResponse.json({ error: "Faltan credenciales." }, { status: 400 });
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  const token = await new SignJWT({
    email: user.email,
    role: user.role,
    extraPermissions: user.extra_permissions,
    revokedPermissions: user.revoked_permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  return NextResponse.json({
    token,
    user: { email: user.email, name: user.name, role: user.role, accountType: user.account_type },
  });
}
