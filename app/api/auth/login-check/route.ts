import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/db/users";
import { TRUSTED_DEVICE_COOKIE } from "@/lib/trustedDeviceCookie";

// Peeks at verifyCredentials() before any NextAuth session exists, purely
// so the login form can ask for a 2FA code without needing to smuggle that
// distinction through NextAuth's authorize()/signIn() error channel. Not a
// second, separate check — the same verifyCredentials() call that
// authorize() makes, just called one step earlier when 2FA is involved.
// The client only ever proceeds to the real signIn() once (either no 2FA
// is needed, or a code has been entered), so a wrong password never gets
// counted twice against the lockout.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  if (!email || !password) {
    return NextResponse.json({ error: "Faltan credenciales." }, { status: 400 });
  }

  const deviceToken = req.cookies.get(TRUSTED_DEVICE_COOKIE)?.value ?? null;
  const result = await verifyCredentials(email, password, undefined, { peek: true, deviceToken });

  if (result.status === "locked") {
    return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo en unos minutos." }, { status: 429 });
  }
  if (result.status === "needs_totp") {
    return NextResponse.json({ needsTotp: true });
  }
  // "invalid" or "ok" — either way the client calls the real signIn() next
  // (which fails the same way "invalid" would), so no need to say which.
  return NextResponse.json({ needsTotp: false });
}
