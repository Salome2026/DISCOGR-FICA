import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createUser, listUsers } from "@/lib/db/users";
import { ROLES, ROLES_BY_ACCOUNT_TYPE, hasPermission, type AccountType, type Role } from "@/lib/permissions";

async function requireAdmin(req: NextRequest): Promise<string | null> {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "administrar_usuarios")) return null;
  return user.email;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const { email, name, password, accountType, roles } = body as {
    email?: string;
    name?: string;
    password?: string;
    accountType?: AccountType;
    roles?: Role[];
  };

  if (!email || !name || !password || !accountType || !roles) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
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
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const dedupedRoles = [...new Set(roles)];

  try {
    await createUser({ email, name, password, accountType, roles: dedupedRoles, createdBy: admin });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate key")) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
