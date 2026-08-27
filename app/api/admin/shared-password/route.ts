import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { setSharedPassword, hasSharedPassword } from "@/lib/db/settings";
import { logActivity } from "@/lib/db/users";
import { hasPermission, type SessionUser } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "administrar_usuarios")) return null;
  return user.email;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const exists = await hasSharedPassword();
  return NextResponse.json({ configured: exists });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { password } = await req.json();
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña común debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }
  await setSharedPassword(password);
  await logActivity(admin, "shared_password_updated");
  return NextResponse.json({ ok: true });
}
