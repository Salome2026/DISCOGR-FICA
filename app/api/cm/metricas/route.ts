import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { upsertAccountMetrics, upsertContentItemMetrics } from "@/lib/db/cmMetrics";
import { canCmAccessAccount } from "@/lib/db/cmAccounts";
import { getContentItem } from "@/lib/db/cmContent";

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Carga manual — un solo POST cubre tanto la métrica diaria de una cuenta
// (body.accountId) como la de un contenido puntual (body.contentItemId).
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email || !hasPermission(user, "editar_cm")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const measuredAt = typeof body?.measuredAt === "string" ? body.measuredAt : "";
  if (!measuredAt) return NextResponse.json({ error: "Falta la fecha de medición." }, { status: 400 });

  if (typeof body?.accountId === "string") {
    if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, body.accountId))) {
      return NextResponse.json({ error: "No tenés acceso a esta cuenta." }, { status: 403 });
    }
    await upsertAccountMetrics({
      accountId: body.accountId,
      measuredAt,
      seguidores: numOrNull(body.seguidores), alcance: numOrNull(body.alcance), impresiones: numOrNull(body.impresiones),
      reproducciones: numOrNull(body.reproducciones), interacciones: numOrNull(body.interacciones), meGusta: numOrNull(body.meGusta),
      comentarios: numOrNull(body.comentarios), compartidos: numOrNull(body.compartidos), guardados: numOrNull(body.guardados),
      tiempoReproduccion: numOrNull(body.tiempoReproduccion), retencionPct: numOrNull(body.retencionPct), clics: numOrNull(body.clics),
      enteredBy: user.email,
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof body?.contentItemId === "number" || typeof body?.contentItemId === "string") {
    const contentItemId = Number(body.contentItemId);
    const item = await getContentItem(contentItemId);
    if (!item) return NextResponse.json({ error: "Contenido no encontrado." }, { status: 404 });
    if (!(await canCmAccessAccount({ email: user.email, roles: user.roles }, item.accountId))) {
      return NextResponse.json({ error: "No tenés acceso a este contenido." }, { status: 403 });
    }
    await upsertContentItemMetrics({
      contentItemId,
      measuredAt,
      views: numOrNull(body.views), retencionPct: numOrNull(body.retencionPct), subsGenerados: numOrNull(body.subsGenerados),
      meGusta: numOrNull(body.meGusta), comentarios: numOrNull(body.comentarios), compartidos: numOrNull(body.compartidos),
      tiempoReproduccion: numOrNull(body.tiempoReproduccion),
      enteredBy: user.email,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Falta accountId o contentItemId." }, { status: 400 });
}
