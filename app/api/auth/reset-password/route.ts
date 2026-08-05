import { NextRequest, NextResponse } from "next/server";
import { passwordResetTokenIsValid, consumePasswordResetToken } from "@/lib/db/passwordResets";
import { resetPassword, forceLogout } from "@/lib/db/users";

// Read-only check the reset-password page uses on load, so it can show
// "this link expired" immediately instead of only after a failed submit.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });
  const valid = await passwordResetTokenIsValid(token);
  return NextResponse.json({ valid });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!token) {
    return NextResponse.json({ error: "Enlace inválido." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const email = await consumePasswordResetToken(token);
  if (!email) {
    return NextResponse.json({ error: "El enlace venció o ya fue usado. Pedí uno nuevo." }, { status: 400 });
  }

  await resetPassword(email, newPassword, email);
  // Bump session_version so any session open elsewhere gets kicked out too —
  // same primitive admins already use for force-logout.
  await forceLogout(email, email);

  return NextResponse.json({ ok: true });
}
