import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUserWithSharedPassword } from "@/lib/db/users";
import { hasSharedPassword } from "@/lib/db/settings";
import { PERMISSIONS, ROLES, ROLES_BY_ACCOUNT_TYPE, hasPermission, type AccountType, type Permission, type Role, type SessionUser } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.email || !hasPermission(user, "administrar_usuarios")) return null;
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
  const { email, name, accountType, roles, revokedPermissions } = body as {
    email?: string;
    name?: string;
    accountType?: AccountType;
    roles?: Role[];
    revokedPermissions?: unknown;
  };

  if (!email || !name || !accountType || !roles) {
    return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
  }
  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: "Debés seleccionar al menos un módulo." }, { status: 400 });
  }
  if (roles.some((r) => !ROLES.includes(r))) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }
  if (roles.some((r) => !ROLES_BY_ACCOUNT_TYPE[accountType].includes(r))) {
    return NextResponse.json({ error: "El rol no corresponde al tipo de cuenta." }, { status: 400 });
  }
  const revoked: Permission[] = Array.isArray(revokedPermissions)
    ? revokedPermissions.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p))
    : [];

  await createUserWithSharedPassword({ email, name, accountType, roles: [...new Set(roles)], revokedPermissions: revoked, createdBy: admin });
  return NextResponse.json({ ok: true }, { status: 201 });
}
