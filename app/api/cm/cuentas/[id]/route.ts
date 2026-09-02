import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getAccount, updateAccount, canCmAccessAccount, addAccountNote, listAccountNotes } from "@/lib/db/cmAccounts";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, id))) {
    return NextResponse.json({ error: "No tenés acceso a esta cuenta." }, { status: 403 });
  }
  const account = await getAccount(id);
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });
  const notes = await listAccountNotes(id);
  return NextResponse.json({ account, notes });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, id))) {
    return NextResponse.json({ error: "No tenés acceso a esta cuenta." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);

  if (typeof body?.note === "string" && body.note.trim()) {
    await addAccountNote(id, user.email, body.note.trim());
    return NextResponse.json({ ok: true });
  }

  // Solo Management/admin edita los datos de la cuenta en sí — la CM deja
  // observaciones (arriba) pero no cambia plataforma/handle/frecuencia.
  if (!hasPermission(user, "editar_management")) {
    return NextResponse.json({ error: "No autorizado para editar la cuenta." }, { status: 401 });
  }
  await updateAccount(
    id,
    {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      platform: typeof body?.platform === "string" ? body.platform.trim() : undefined,
      handle: body?.handle !== undefined ? (typeof body.handle === "string" ? body.handle.trim() || null : null) : undefined,
      url: body?.url !== undefined ? (typeof body.url === "string" ? body.url.trim() || null : null) : undefined,
      photoUrl: body?.photoUrl !== undefined ? (typeof body.photoUrl === "string" ? body.photoUrl.trim() || null : null) : undefined,
      sello: body?.sello !== undefined ? (typeof body.sello === "string" ? body.sello.trim() || null : null) : undefined,
      frecuenciaPublicacionAcordada: body?.frecuenciaPublicacionAcordada !== undefined ? (typeof body.frecuenciaPublicacionAcordada === "string" ? body.frecuenciaPublicacionAcordada.trim() || null : null) : undefined,
      active: typeof body?.active === "boolean" ? body.active : undefined,
    },
    user.email
  );
  return NextResponse.json({ ok: true });
}
