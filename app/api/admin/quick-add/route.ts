import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUserWithSharedPassword } from "@/lib/db/users";
import { hasSharedPassword } from "@/lib/db/settings";
import { ROLES, type AccountType, type Role } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || user.role !== "admin") return null;
  return user.email;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const configured = await hasSharedPassword();
  if (!configured) {
    return NextResponse.json(
      { error: "Primero definí la contraseña común más abajo." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { email, name, accountType, role } = body as {
    email?: string;
    name?: string;
    accountType?: AccountType;
    role?: Role;
  };

  if (!email || !name || !accountType || !role) {
    return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  await createUserWithSharedPassword({ email, name, accountType, role, createdBy: admin });
  return NextResponse.json({ ok: true }, { status: 201 });
}
