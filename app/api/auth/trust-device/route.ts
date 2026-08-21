import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { trustDevice } from "@/lib/db/trustedDevices";
import { TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_COOKIE_MAX_AGE } from "@/lib/trustedDeviceCookie";

// Called by the client right after every successful login — renews the
// 30-day trust window whether this login just verified a fresh TOTP code or
// skipped it because the browser was already trusted. No-op for accounts
// without 2FA (nothing to skip, so nothing to remember), and deliberately
// doesn't report totp_enabled status either way — a client that isn't
// already authenticated has no business learning that from this endpoint.
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await getUserByEmail(email);
  if (!user?.totp_enabled) return NextResponse.json({ ok: true, skipped: true });

  const existing = req.cookies.get(TRUSTED_DEVICE_COOKIE)?.value ?? null;
  const token = await trustDevice(email, existing);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUSTED_DEVICE_COOKIE_MAX_AGE,
  });
  return res;
}
