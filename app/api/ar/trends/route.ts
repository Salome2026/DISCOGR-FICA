import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listGenreTrendSignals, createGenreTrendSignal, type ArGenreTrendDirection } from "@/lib/db/arGenreTrends";
import { createAlertIfNew } from "@/lib/db/arAlerts";
import { normalizeName } from "@/lib/participants";

const DIRECTIONS: ArGenreTrendDirection[] = ["growing", "declining", "stable"];

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "ver_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const signals = await listGenreTrendSignals();
  return NextResponse.json({ signals });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !hasPermission(user, "editar_ar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = (await req.json()) as {
    genre?: string;
    trendDirection?: ArGenreTrendDirection;
    region?: string;
    sourceType?: string;
    note?: string | null;
    evidenceUrl?: string | null;
  };
  if (!body.genre?.trim()) {
    return NextResponse.json({ error: "Falta indicar el género." }, { status: 400 });
  }
  if (!body.trendDirection || !DIRECTIONS.includes(body.trendDirection)) {
    return NextResponse.json({ error: "Dirección de tendencia inválida." }, { status: 400 });
  }
  if (!body.sourceType?.trim()) {
    return NextResponse.json({ error: "Falta indicar la fuente." }, { status: 400 });
  }

  const signal = await createGenreTrendSignal({
    genre: body.genre.trim(),
    trendDirection: body.trendDirection,
    region: body.region?.trim() || "AR",
    sourceType: body.sourceType.trim(),
    note: body.note?.trim() || null,
    evidenceUrl: body.evidenceUrl?.trim() || null,
    reportedBy: user.email,
  });

  if (signal.trendDirection === "growing") {
    // dedupeKey por género normalizado, no por signal.id — cada reporte
    // inserta una fila nueva en ar_genre_trend_signals (createGenreTrendSignal
    // nunca hace upsert), así que un id siempre sería único y el dedupe no
    // serviría de nada. La alerta nunca debe tumbar esta respuesta: el
    // género ya quedó guardado igual, perder solo la notificación es
    // aceptable.
    await createAlertIfNew({
      alertType: "genre_trending",
      severity: "info",
      message: `Se reportó "${signal.genre}" como género en crecimiento (fuente: ${signal.sourceType}).`,
      dedupeKey: `genre_trending:${normalizeName(signal.genre)}`,
    }).catch(() => {});
  }

  return NextResponse.json({ signal });
}
