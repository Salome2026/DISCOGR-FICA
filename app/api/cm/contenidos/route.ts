import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { createContentItem, listContentForAccounts, CM_TIPOS_CONTENIDO, CM_ESTADOS } from "@/lib/db/cmContent";
import { listAllAccounts, listAccountsForCm, canCmAccessAccount } from "@/lib/db/cmAccounts";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "ver_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Faltan start/end." }, { status: 400 });
  }
  const accounts = user.roles.includes("admin") || user.roles.includes("management")
    ? await listAllAccounts()
    : await listAccountsForCm(user.email);
  const items = await listContentForAccounts(accounts.map((a) => a.id), start, end);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const tipoContenido = typeof body?.tipoContenido === "string" ? body.tipoContenido : "";
  const fecha = typeof body?.fecha === "string" ? body.fecha : "";
  if (!accountId || !tipoContenido || !fecha) {
    return NextResponse.json({ error: "Faltan campos obligatorios: cuenta, tipo de contenido y fecha." }, { status: 400 });
  }
  if (!(CM_TIPOS_CONTENIDO as readonly string[]).includes(tipoContenido)) {
    return NextResponse.json({ error: "Tipo de contenido inválido." }, { status: 400 });
  }
  const estado = typeof body?.estado === "string" && (CM_ESTADOS as readonly string[]).includes(body.estado) ? body.estado : "idea";
  if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, accountId))) {
    return NextResponse.json({ error: "No tenés acceso a esta cuenta." }, { status: 403 });
  }
  const item = await createContentItem({
    accountId,
    artistName: typeof body?.artistName === "string" ? body.artistName.trim() || null : null,
    linkedArtistId: typeof body?.linkedArtistId === "string" ? body.linkedArtistId.trim() || null : null,
    tipoContenido,
    fecha,
    hora: typeof body?.hora === "string" ? body.hora.trim() || null : null,
    copyText: typeof body?.copyText === "string" ? body.copyText.trim() || null : null,
    hashtags: typeof body?.hashtags === "string" ? body.hashtags.trim() || null : null,
    assetsUrl: typeof body?.assetsUrl === "string" ? body.assetsUrl.trim() || null : null,
    audioUrl: typeof body?.audioUrl === "string" ? body.audioUrl.trim() || null : null,
    responsableEmail: typeof body?.responsableEmail === "string" ? body.responsableEmail.trim() || null : user.email,
    estado,
    linkedLaunchId: typeof body?.linkedLaunchId === "string" ? body.linkedLaunchId.trim() || null : null,
    createdBy: user.email,
  });
  return NextResponse.json({ item }, { status: 201 });
}
