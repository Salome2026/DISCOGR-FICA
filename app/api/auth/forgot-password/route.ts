import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { createPasswordResetToken } from "@/lib/db/passwordResets";
import { sendPasswordResetEmail } from "@/lib/emailAuth";

const GENERIC_MESSAGE = "Si el correo está registrado, vas a recibir un enlace para restablecer tu contraseña.";

// Always returns the same shape/message whether or not the email exists —
// that's the point (no account-enumeration via this endpoint). Anything
// that could differ (lookup, token creation, sending) happens inside the
// try and never changes the response.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Ingresá tu correo electrónico." }, { status: 400 });
  }

  try {
    const user = await getUserByEmail(email);
    if (user && user.active) {
      const token = await createPasswordResetToken(user.email);
      const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
  } catch (err) {
    console.error("Error en forgot-password:", err);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
