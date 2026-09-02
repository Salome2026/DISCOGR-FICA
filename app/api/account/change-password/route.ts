import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { verifyCredentials, resetPassword, forceLogout } from "@/lib/db/users";

// Self-service password change from the account page — requires proving the
// current password (and a TOTP code, if enabled) rather than trusting the
// active session alone. Reuses verifyCredentials() (same check login uses,
// including the uses_shared_password branch) instead of re-implementing it,
// and resetPassword() for the actual write (same one "olvidé mi contraseña"
// uses) so both paths land in the exact same state: a personal hash,
// uses_shared_password=false, every other open session logged out.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword as string | undefined;
  const newPassword = body?.newPassword as string | undefined;
  const code = body?.code as string | undefined;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Completá tu contraseña actual y la nueva." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "La contraseña nueva debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const result = await verifyCredentials(user.email, currentPassword, code);
  if (result.status === "needs_totp") {
    return NextResponse.json({ error: "Ingresá también tu código de verificación en dos pasos.", needsTotp: true }, { status: 401 });
  }
  if (result.status !== "ok") {
    return NextResponse.json({ error: "La contraseña actual es incorrecta." }, { status: 401 });
  }

  await resetPassword(user.email, newPassword, user.email);
  // Same "start over everywhere" behavior as the forgot-password flow —
  // this request's own session gets kicked too, so the client should
  // sign the user back in right after a successful response.
  await forceLogout(user.email, user.email);
  return NextResponse.json({ ok: true });
}
