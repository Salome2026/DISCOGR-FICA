import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listGenreTrendSignals, createGenreTrendSignal, type ArGenreTrendDirection } from "@/lib/db/arGenreTrends";

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
  return NextResponse.json({ signal });
}
