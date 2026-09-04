import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission, SessionUser } from "@/lib/permissions";
import { getOrCreateToken, revokeToken } from "@/lib/db/calendarFeedTokens";

const FEED_SCOPE = "management_meetings";

function feedUrls(req: NextRequest, token: string) {
  const origin = req.nextUrl.origin;
  const httpsUrl = `${origin}/api/management-meetings/feed?token=${token}`;
  const webcalUrl = `webcal://${req.nextUrl.host}/api/management-meetings/feed?token=${token}`;
  return { httpsUrl, webcalUrl };
}

function canUseFeed(user: SessionUser | null): boolean {
  if (!user?.roles?.length) return false;
  return hasPermission(user, "ver_management") || user.roles.includes("project_manager");
}

// "Vincular con Apple Calendar" — devuelve la URL de suscripción del usuario
// actual (creando su token si todavía no tiene uno). Nunca pide ni ve
// credenciales de iCloud: el token es lo único que identifica a la persona
// ante el feed público (app/api/management-meetings/feed/route.ts).
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !canUseFeed(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const token = await getOrCreateToken(user.email, FEED_SCOPE);
  return NextResponse.json(feedUrls(req, token));
}

// Revocar invalida el link viejo de inmediato (Apple Calendar empieza a
// recibir 401 y deja de sincronizar) — la próxima vez que el usuario pida
// vincularse de nuevo, se emite un token nuevo.
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !canUseFeed(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await revokeToken(user.email, FEED_SCOPE);
  return NextResponse.json({ ok: true });
}
