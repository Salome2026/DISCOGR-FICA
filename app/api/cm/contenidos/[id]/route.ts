import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getContentItem, updateContentItem, deleteContentItem, CM_TIPOS_CONTENIDO, CM_ESTADOS } from "@/lib/db/cmContent";
import { canCmAccessAccount } from "@/lib/db/cmAccounts";

async function checkAccess(req: NextRequest, id: number) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) return { error: "No autorizado" as const, status: 401 };
  const item = await getContentItem(id);
  if (!item) return { error: "Contenido no encontrado." as const, status: 404 };
  if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, item.accountId))) {
    return { error: "No tenés acceso a este contenido." as const, status: 403 };
  }
  return { user, item };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, Number(id));
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  const body = await req.json().catch(() => null);
  if (body?.tipoContenido && !(CM_TIPOS_CONTENIDO as readonly string[]).includes(body.tipoContenido)) {
    return NextResponse.json({ error: "Tipo de contenido inválido." }, { status: 400 });
  }
  if (body?.estado && !(CM_ESTADOS as readonly string[]).includes(body.estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  await updateContentItem(
    Number(id),
    {
      tipoContenido: body?.tipoContenido,
      titulo: body?.titulo !== undefined ? body.titulo || null : undefined,
      plataforma: body?.plataforma !== undefined ? body.plataforma || null : undefined,
      fecha: body?.fecha,
      hora: body?.hora !== undefined ? body.hora || null : undefined,
      copyText: body?.copyText !== undefined ? body.copyText || null : undefined,
      hashtags: body?.hashtags !== undefined ? body.hashtags || null : undefined,
      assetsUrl: body?.assetsUrl !== undefined ? body.assetsUrl || null : undefined,
      audioUrl: body?.audioUrl !== undefined ? body.audioUrl || null : undefined,
      responsableEmail: body?.responsableEmail !== undefined ? body.responsableEmail || null : undefined,
      estado: body?.estado,
      publishedUrl: body?.publishedUrl !== undefined ? body.publishedUrl || null : undefined,
      bloqueadoMotivo: body?.bloqueadoMotivo !== undefined ? body.bloqueadoMotivo || null : undefined,
    },
    check.user.email
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await checkAccess(req, Number(id));
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });
  await deleteContentItem(Number(id));
  return NextResponse.json({ ok: true });
}
