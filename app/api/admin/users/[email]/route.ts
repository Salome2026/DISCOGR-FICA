import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  addRole,
  removeRole,
  setPermissionOverrides,
  setUserActive,
  resetPassword,
  forceLogout,
  setAssignedArtists,
  getUserByEmail,
} from "@/lib/db/users";
import { ROLES, ROLES_BY_ACCOUNT_TYPE, PERMISSIONS, hasPermission, type Permission, type Role } from "@/lib/permissions";

async function requireAdmin(req: NextRequest): Promise<string | null> {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "administrar_usuarios")) return null;
  return user.email;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { email } = await params;
  const targetEmail = decodeURIComponent(email);
  const body = await req.json();

  if (body.action === "add_role") {
    const role = body.role as Role;
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }
    const target = await getUserByEmail(targetEmail);
    if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (!ROLES_BY_ACCOUNT_TYPE[target.account_type].includes(role)) {
      return NextResponse.json({ error: "El rol no corresponde al tipo de cuenta de este usuario." }, { status: 400 });
    }
    await addRole(targetEmail, role, admin);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove_role") {
    const role = body.role as Role;
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }
    try {
      await removeRole(targetEmail, role, admin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_permission_overrides") {
    const extra = (body.extraPermissions ?? []) as Permission[];
    const revoked = (body.revokedPermissions ?? []) as Permission[];
    if (extra.some((p) => !PERMISSIONS.includes(p)) || revoked.some((p) => !PERMISSIONS.includes(p))) {
      return NextResponse.json({ error: "Permiso inválido." }, { status: 400 });
    }
    await setPermissionOverrides(targetEmail, extra, revoked, admin);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_active") {
    await setUserActive(decodeURIComponent(email), !!body.active, admin);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reset_password") {
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Contraseña muy corta." }, { status: 400 });
    }
    await resetPassword(decodeURIComponent(email), body.password, admin);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "force_logout") {
    await forceLogout(decodeURIComponent(email), admin);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_assigned_artists") {
    await setAssignedArtists(decodeURIComponent(email), body.artists ?? []);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
