import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  updateUserRole,
  setUserActive,
  resetPassword,
  forceLogout,
  setAssignedArtists,
} from "@/lib/db/users";
import { ROLES, PERMISSIONS, type Permission, type Role } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || user.role !== "admin") return null;
  return user.email;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { email } = await params;
  const body = await req.json();

  if (body.action === "set_role") {
    const role = body.role as Role;
    const extra = (body.extraPermissions ?? []) as Permission[];
    const revoked = (body.revokedPermissions ?? []) as Permission[];
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }
    if (extra.some((p) => !PERMISSIONS.includes(p)) || revoked.some((p) => !PERMISSIONS.includes(p))) {
      return NextResponse.json({ error: "Permiso inválido." }, { status: 400 });
    }
    await updateUserRole(decodeURIComponent(email), role, extra, revoked, admin);
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
