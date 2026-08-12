import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { verifyCredentials, disableTotp } from "@/lib/db/users";

// Requires the current password AND a valid code (live or backup) to turn
// 2FA off — having an active session isn't enough proof that whoever's
// clicking still controls the second factor. Reuses verifyCredentials()
// itself rather than re-implementing that check.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const password = body?.password as string | undefined;
  const code = body?.code as string | undefined;
  if (!password || !code) {
    return NextResponse.json({ error: "Falta la contraseña o el código." }, { status: 400 });
  }

  const result = await verifyCredentials(user.email, password, code);
  if (result.status !== "ok") {
    return NextResponse.json({ error: "Contraseña o código incorrectos." }, { status: 401 });
  }

  await disableTotp(user.email, user.email);
  return NextResponse.json({ ok: true });
}
